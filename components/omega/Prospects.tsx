"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Entreprises » du pilotage : la liste de prospection (09/10/2026)

   Le fichier collecté le 06/10 (branche prospection-guadeloupe) : 11 901
   établissements de Guadeloupe et 52 de Martinique, rangés par SECTEUR,
   chacun avec les MOTEURS à lui vendre (le premier est celui qui ouvre la
   porte). Les filtres (secteur, recherche, téléphone, statut, page) vivent
   dans l'adresse : la base ne renvoie que 50 lignes à la fois. Le statut
   et la note se modifient sur place.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Phone, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FiltresProspects, Prospect, Secteur } from "@/lib/omega/donnees";
import "@/components/espace2/habillage.css";

const STATUTS = ["À contacter", "Appelé", "Rappeler", "Visité", "Audit réservé", "Client", "Pas intéressé", "Ne plus contacter"];
const teinte = (s: string) => (s === "Client" || s === "Audit réservé" ? "vert" : s === "Appelé" || s === "Visité" || s === "Rappeler" ? "bleu" : s === "Pas intéressé" || s === "Ne plus contacter" ? "rouge" : "gris");

export default function Prospects({ lignes: initiales, total, page, parPage, secteurs, filtres }: { lignes: Prospect[]; total: number; page: number; parPage: number; secteurs: Secteur[]; filtres: FiltresProspects }) {
  const router = useRouter();
  const [lignes, setLignes] = useState(initiales);
  const [vues, setVues] = useState(initiales);
  if (vues !== initiales) {
    setVues(initiales);
    setLignes(initiales);
  }
  const [q, setQ] = useState(filtres.q ?? "");
  const [etat, setEtat] = useState("");

  const lien = (changes: Partial<FiltresProspects>) => {
    const p = new URLSearchParams();
    const tout = { ...filtres, page: undefined, ...changes };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/omega/entreprises${s ? `?${s}` : ""}`;
  };

  async function maj(id: number, champ: "statut" | "note", valeur: string) {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, [champ]: valeur } : l)));
    const { error } = await createClient().from("omega_prospects").update({ [champ]: valeur, maj: new Date().toISOString() }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement." : "Enregistré");
  }

  const tous = secteurs.reduce((s, x) => s + x.total, 0);
  const avecTel = secteurs.reduce((s, x) => s + x.avec_tel, 0);
  const contactes = secteurs.reduce((s, x) => s + x.contactes, 0);
  const actif = secteurs.find((s) => s.secteur === filtres.secteur);
  const pages = Math.max(1, Math.ceil(total / parPage));

  return (
    <div className="v2-va om-prospects">
      <section className="v2-va-kpis" aria-label="Chiffres de la prospection">
        <Link href={lien({ secteur: undefined, tel: undefined, statut: undefined, q: undefined })} className="v2-va-kpi">
          <span className="v2-va-kpi-libelle">Établissements</span>
          <strong>{tous.toLocaleString("fr-FR")}</strong>
          <small className="v2-gris v2-va-kpi-sous">Guadeloupe et Martinique</small>
        </Link>
        <Link href={lien({ tel: "1" })} className="v2-va-kpi">
          <span className="v2-va-kpi-libelle">Avec téléphone</span>
          <strong>{avecTel.toLocaleString("fr-FR")}</strong>
          <small className="v2-gris v2-va-kpi-sous">à appeler en premier</small>
        </Link>
        <Link href={lien({ statut: "Appelé" })} className="v2-va-kpi">
          <span className="v2-va-kpi-libelle">Déjà contactés</span>
          <strong>{contactes.toLocaleString("fr-FR")}</strong>
          <small className="v2-gris v2-va-kpi-sous">statut autre que « À contacter »</small>
        </Link>
        <Link href={lien({ secteur: undefined })} className="v2-va-kpi">
          <span className="v2-va-kpi-libelle">Secteurs</span>
          <strong>{secteurs.length}</strong>
          <small className="v2-gris v2-va-kpi-sous">chacun avec ses moteurs</small>
        </Link>
      </section>

      <section className="v2-carte v2-carte-corps">
        <div className="v2-va-titre">
          <h2 className="v2-h2">Par secteur</h2>
          <span className="v2-gris">le premier moteur est celui qui ouvre la porte</span>
        </div>
        <div className="om-secteurs">
          <Link href={lien({ secteur: undefined })} className="om-secteur" aria-current={!filtres.secteur ? "true" : undefined}>
            <span className="om-secteur-nom">Tous les secteurs</span>
            <span className="v2-gris">{tous.toLocaleString("fr-FR")}</span>
          </Link>
          {secteurs.map((s) => (
            <Link key={s.secteur} href={lien({ secteur: s.secteur })} className="om-secteur" aria-current={filtres.secteur === s.secteur ? "true" : undefined}>
              <span className="om-secteur-nom">{s.secteur}</span>
              <span className="om-moteurs">
                {s.moteurs.map((m, i) => (
                  <span key={m} className="om-moteur" data-premier={i === 0 ? "" : undefined}>
                    {m}
                  </span>
                ))}
              </span>
              <span className="v2-gris om-secteur-chiffres">
                {s.total.toLocaleString("fr-FR")} · {s.avec_tel} avec tél.
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="v2-carte v2-carte-corps">
        <div className="v2-va-titre">
          <div>
            <h2 className="v2-h2">{actif ? actif.secteur : "Toutes les entreprises"}</h2>
            <p className="v2-gris v2-va-sous">
              {total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""}
              {actif ? ` · à vendre : ${actif.moteurs.join(", ")}` : ""} · {etat}
            </p>
          </div>
        </div>
        <form
          className="om-filtres"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(lien({ q: q.trim() || undefined }));
          }}
        >
          <span className="v2-champ om-filtre-recherche">
            <Search width={16} height={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, commune, dirigeant…" aria-label="Rechercher" />
          </span>
          <label className="om-bascule">
            <input type="checkbox" checked={filtres.tel === "1"} onChange={(e) => router.push(lien({ tel: e.target.checked ? "1" : undefined }))} />
            Avec téléphone seulement
          </label>
          <span className="v2-champ">
            <select value={filtres.statut ?? ""} onChange={(e) => router.push(lien({ statut: e.target.value || undefined }))} aria-label="Statut">
              <option value="">Tous les statuts</option>
              {STATUTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </span>
        </form>

        <div className="v2-tableau-cadre om-tableau-cadre">
          <table className="v2-tableau om-grille om-grille-prospects">
            <thead>
              <tr>
                <th data-large="">Entreprise</th>
                <th>Secteur</th>
                <th>À vendre</th>
                <th>Téléphone</th>
                <th>E-mail</th>
                <th>Effectif</th>
                <th>Statut</th>
                <th data-large="">Note</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong className="om-p-nom">{l.enseigne || l.entreprise}</strong>
                    <small className="v2-gris om-p-sous">
                      {[l.enseigne ? l.entreprise : null, l.dirigeant, l.commune, l.departement === "972" ? "Martinique" : null, l.personne_physique ? "entrepreneur individuel" : null].filter(Boolean).join(" · ")}
                    </small>
                  </td>
                  <td className="v2-gris">{l.secteur}</td>
                  <td>
                    <span className="om-moteurs">
                      {l.moteurs.map((m, i) => (
                        <span key={m} className="om-moteur" data-premier={i === 0 ? "" : undefined}>
                          {m}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td>
                    {l.telephone ? (
                      <a href={`tel:${l.telephone.replace(/[^\d+]/g, "")}`} className="om-tel">
                        <Phone width={13} height={13} aria-hidden="true" /> {l.telephone}
                      </a>
                    ) : (
                      <span className="v2-gris">—</span>
                    )}
                  </td>
                  <td>{l.courriel ? <a href={`mailto:${l.courriel}`}>{l.courriel}</a> : <span className="v2-gris">—</span>}</td>
                  <td className="v2-gris">{l.effectif ?? "—"}</td>
                  <td>
                    <select className="om-choix" data-teinte={teinte(l.statut)} value={l.statut} onChange={(e) => maj(l.id, "statut", e.target.value)} aria-label={`Statut de ${l.entreprise}`}>
                      {STATUTS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Note valeur={l.note ?? ""} onValider={(v) => maj(l.id, "note", v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav className="om-pagination" aria-label="Pages">
          {page > 1 ? (
            <Link href={lien({ page: String(page - 1) })} className="v2-btn v2-btn--petit">
              <ChevronLeft width={14} height={14} aria-hidden="true" /> Précédente
            </Link>
          ) : (
            <span />
          )}
          <span className="v2-gris">
            Page {page} sur {pages}
          </span>
          {page < pages ? (
            <Link href={lien({ page: String(page + 1) })} className="v2-btn v2-btn--petit">
              Suivante <ChevronRight width={14} height={14} aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
        <p className="v2-gris om-note">Règles : un professionnel peut être appelé (Bloctel ne protège que les particuliers), mais un « non » est définitif → statut « Ne plus contacter ». Soyez sobres avec les entrepreneurs individuels (RGPD).</p>
      </section>
    </div>
  );
}

function Note({ valeur, onValider }: { valeur: string; onValider: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  return <textarea className="om-cellule" rows={1} value={v} placeholder="Ajouter une note" aria-label="Note" onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() !== valeur && onValider(v.trim())} />;
}
