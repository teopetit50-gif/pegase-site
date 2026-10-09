"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Entreprises » du pilotage : la prospection (09/10/2026, redessinée)

   Retour de Teo : « mal designé, privilégier un design propre avec
   plusieurs sections, et le sélecteur ⌃⌄ pour changer ». Même grammaire
   que les écrans de /espace2 :
     1. la barre : le secteur au sélecteur ⌃⌄ (comme la portée du haut),
        le statut, « avec téléphone », la recherche à droite ;
     2. le secteur en trois cartes à jauge (établissements, téléphone,
        contactés) ;
     3. ce qu'on leur vend : les moteurs, le premier ouvre la porte, avec
        la fiche de vente et les vidéos de chacun ;
     4. la liste, 50 lignes par page, statut et note modifiables.
   Les filtres vivent dans l'adresse ; la base ne renvoie que la page vue.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, LayoutGrid, ListFilter, Phone, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Chiffre } from "@/components/espace2/vivant";
import { ItemMenu, MenuDeroulant, SectionMenu, SeparateurMenu } from "@/components/espace2/ui";
import type { FiltresProspects, Prospect, Secteur } from "@/lib/omega/donnees";

const STATUTS = ["À contacter", "Appelé", "Rappeler", "Visité", "Audit réservé", "Client", "Pas intéressé", "Ne plus contacter"];
const teinte = (s: string) => (s === "Client" || s === "Audit réservé" ? "vert" : s === "Appelé" || s === "Visité" || s === "Rappeler" ? "bleu" : s === "Pas intéressé" || s === "Ne plus contacter" ? "rouge" : "gris");
export const ROLE: Record<string, string> = {
  CASHD: "relance les devis et les factures en retard",
  REPUT: "répond aux demandes et demande les avis",
  FILED: "lit et classe les factures fournisseurs",
  OFFLOAD: "relance les clients qui ne commandent plus",
  Daliro: "fait signer les travaux supplémentaires",
  Tavaro: "facture chaque restitution, preuves jointes",
  Lorani: "croise plans, CCTP et DPGF",
  Tamila: "relie chaque fait à sa pièce",
  Tiroma: "reprend les créneaux libérés",
  Varelo: "met tout le groupe sur une page",
};
const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function Prospects({ lignes: initiales, total, page, parPage, secteurs, filtres }: { lignes: Prospect[]; total: number; page: number; parPage: number; secteurs: Secteur[]; filtres: FiltresProspects }) {
  const router = useRouter();
  const [lignes, setLignes] = useState(initiales);
  const [vues, setVues] = useState(initiales);
  if (vues !== initiales) {
    setVues(initiales);
    setLignes(initiales);
  }
  const [recherche, setRecherche] = useState<string | null>(filtres.q ?? null);
  const [etat, setEtat] = useState("");

  const lien = (changes: Partial<FiltresProspects>) => {
    const p = new URLSearchParams();
    const tout = { ...filtres, page: undefined, ...changes };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/omega/entreprises${s ? `?${s}` : ""}`;
  };

  const [ajoutes, setAjoutes] = useState<number[]>([]);
  async function versContact(l: Prospect) {
    const { error } = await createClient().from("omega_contacts").insert({ nom: l.dirigeant?.replace(/\s*\(.*\)$/, "") || l.enseigne || l.entreprise, entreprise: l.enseigne || l.entreprise, role: l.dirigeant?.match(/\((.*)\)/)?.[1] ?? null, type: "Prospect", telephone: l.telephone, courriel: l.courriel, commune: l.commune, secteur: l.secteur, source: "Liste des entreprises", prospect_id: l.id, note: `À vendre : ${l.moteurs.join(", ")}` });
    if (error) return setEtat("Échec de l'ajout aux contacts.");
    setAjoutes((a) => [...a, l.id]);
    setEtat(`${l.enseigne || l.entreprise} ajouté aux contacts`);
  }

  async function maj(id: number, champ: "statut" | "note", valeur: string) {
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, [champ]: valeur } : l)));
    const { error } = await createClient().from("omega_prospects").update({ [champ]: valeur, maj: new Date().toISOString() }).eq("id", id);
    setEtat(error ? "Échec de l'enregistrement." : "Enregistré");
  }

  const actif = secteurs.find((s) => s.secteur === filtres.secteur) ?? null;
  const portee = actif ?? { secteur: "Tous les secteurs", moteurs: [] as string[], total: secteurs.reduce((s, x) => s + x.total, 0), avec_tel: secteurs.reduce((s, x) => s + x.avec_tel, 0), contactes: secteurs.reduce((s, x) => s + x.contactes, 0) };
  const pages = Math.max(1, Math.ceil(total / parPage));

  return (
    <div className="v2-page v2-arrivee v2-val v2-dr om-prospects">
      <h1 className="v2-sr">Entreprises</h1>

      {/* ——— 1. la barre : secteur ⌃⌄, statut, téléphone, recherche ——— */}
      <div className="v2-val-filtres">
        <MenuDeroulant
          etiquette={`Secteur : ${portee.secteur}. Changer de secteur`}
          classe="v2-portee om-portee-secteur"
          placement="bottom start"
          largeur={340}
          declencheur={
            <>
              {actif ? <Building2 {...I} /> : <LayoutGrid {...I} />}
              <span className="v2-portee-nom">{portee.secteur}</span>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </>
          }
        >
          <ItemMenu id="tous" href={lien({ secteur: undefined })} textValue="Tous les secteurs" icone={<LayoutGrid {...I} />} suffixe={<span className="v2-gris">{portee && !actif ? "✓" : ""}</span>}>
            Tous les secteurs
          </ItemMenu>
          <SeparateurMenu />
          <SectionMenu titre="Secteurs">
            {secteurs.map((s) => (
              <ItemMenu key={s.secteur} id={s.secteur} href={lien({ secteur: s.secteur })} textValue={s.secteur} icone={<Building2 {...I} />} suffixe={<span className="v2-gris">{s.total.toLocaleString("fr-FR")}</span>}>
                {s.secteur}
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>

        <label className="v2-val-bouton" data-actif={filtres.statut ? "" : undefined}>
          <ListFilter {...I} />
          <span>{filtres.statut ?? "Tous les statuts"}</span>
          <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
          <select value={filtres.statut ?? ""} onChange={(e) => router.push(lien({ statut: e.target.value || undefined }))} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>

        <Link href={lien({ tel: filtres.tel === "1" ? undefined : "1" })} className="v2-val-bouton" data-actif={filtres.tel === "1" ? "" : undefined} aria-pressed={filtres.tel === "1"}>
          <Phone {...I} />
          <span>Avec téléphone</span>
        </Link>

        <span className="v2-val-droite">
          {recherche !== null ? (
            <form
              className="v2-val-recherche"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(lien({ q: recherche.trim() || undefined }));
              }}
            >
              <Search width={16} height={16} aria-hidden="true" />
              <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, commune, dirigeant… puis Entrée" aria-label="Rechercher une entreprise" />
              <button
                type="button"
                className="v2-val-icone"
                aria-label="Fermer la recherche"
                onClick={() => {
                  setRecherche(null);
                  if (filtres.q) router.push(lien({ q: undefined }));
                }}
              >
                <X width={14} height={14} />
              </button>
            </form>
          ) : (
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Rechercher" onClick={() => setRecherche("")}>
              <Search width={16} height={16} />
            </button>
          )}
        </span>
      </div>

      {/* ——— 2. le secteur en trois jauges ——— */}
      <div className="v2-dr-trois">
        <Jauge icone={Building2} titre="Établissements" fort={portee.total.toLocaleString("fr-FR")} faible={actif ? ` dans ce secteur` : ` en Guadeloupe et Martinique`} part={1} pied={actif ? `${((portee.total / Math.max(1, secteurs.reduce((s, x) => s + x.total, 0))) * 100).toFixed(1)} % de la liste` : `${secteurs.length} secteurs`} />
        <Jauge icone={Phone} titre="Avec téléphone" fort={portee.avec_tel.toLocaleString("fr-FR")} faible={` / ${portee.total.toLocaleString("fr-FR")}`} part={portee.total ? portee.avec_tel / portee.total : 0} pied="à appeler en premier" />
        <Jauge icone={CheckCheck} titre="Contactés" fort={portee.contactes.toLocaleString("fr-FR")} faible={` / ${portee.total.toLocaleString("fr-FR")}`} part={portee.total ? portee.contactes / portee.total : 0} pied={`${(portee.total - portee.contactes).toLocaleString("fr-FR")} encore à contacter`} />
      </div>

      {/* ——— 3. ce qu'on leur vend ——— */}
      <section className="v2-carte om-section-carte">
        <div className="om-section-tete">
          <h2 className="v2-val-groupe">{actif ? "Ce qu'on leur vend" : "Les secteurs les plus fournis"}</h2>
          {actif ? <span className="v2-gris">le premier moteur ouvre la porte</span> : <span className="v2-gris">choisis un secteur avec ⌃⌄</span>}
        </div>
        {actif ? (
          <ul className="v2-dr-liste om-vente">
            {actif.moteurs.map((m, i) => (
              <li key={m} data-premier={i === 0 ? "" : undefined}>
                <span className="om-moteur" data-premier={i === 0 ? "" : undefined}>
                  {m}
                </span>
                <span>
                  <span>{i === 0 ? "Ouvre la porte" : `En complément ${i === 1 ? "immédiat" : "ensuite"}`}</span>
                  <small>{ROLE[m] ?? ""}</small>
                </span>
                <span className="om-vente-liens">
                  <Link href={`/omega/${m.toLowerCase()}`} className="v2-val-bouton">
                    Fiche de vente <ArrowUpRight width={14} height={14} aria-hidden="true" />
                  </Link>
                  <Link href={`/omega/${m.toLowerCase()}/videos`} className="v2-val-bouton">
                    Vidéos
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="v2-dr-liste">
            {secteurs.slice(0, 8).map((s, i) => (
              <li key={s.secteur} data-premier={i === 0 ? "" : undefined}>
                <Building2 width={18} height={18} aria-hidden="true" />
                <span>
                  <span>{s.secteur}</span>
                  <small>
                    {s.total.toLocaleString("fr-FR")} établissements · {s.avec_tel} avec téléphone · {s.moteurs.join(", ")}
                  </small>
                </span>
                <Link href={lien({ secteur: s.secteur })} aria-label={`Ouvrir le secteur ${s.secteur}`}>
                  <ChevronRight width={16} height={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ——— 4. la liste ——— */}
      <section className="v2-carte om-section-carte">
        <div className="om-section-tete">
          <h2 className="v2-val-groupe">
            {filtres.tel === "1" ? "À appeler" : "La liste"} · {total.toLocaleString("fr-FR")} entreprise{total > 1 ? "s" : ""}
          </h2>
          <span className="v2-gris" role="status">
            {etat}
          </span>
        </div>
        <div className="v2-tableau-cadre om-liste-cadre">
          <table className="v2-va-table om-liste">
            <thead>
              <tr>
                <th>Entreprise</th>
                {actif ? null : <th>Secteur</th>}
                <th>Téléphone</th>
                <th>Statut</th>
                <th>Note</th>
                <th aria-label="Contacts" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <span className="om-p-nom">{l.enseigne || l.entreprise}</span>
                    <small className="v2-gris om-p-sous">
                      {[l.commune, l.dirigeant, l.effectif ? `${l.effectif} sal.` : null, l.departement === "972" ? "Martinique" : null, l.personne_physique ? "entrepreneur individuel" : null].filter(Boolean).join(" · ")}
                    </small>
                  </td>
                  {actif ? null : (
                    <td>
                      <span className="om-p-sous">{l.secteur}</span>
                      <span className="om-moteurs">
                        {l.moteurs.slice(0, 2).map((m, i) => (
                          <span key={m} className="om-moteur" data-premier={i === 0 ? "" : undefined}>
                            {m}
                          </span>
                        ))}
                      </span>
                    </td>
                  )}
                  <td>
                    {l.telephone ? (
                      <a href={`tel:${l.telephone.replace(/[^\d+]/g, "")}`} className="om-tel">
                        <Phone width={13} height={13} aria-hidden="true" /> {l.telephone}
                      </a>
                    ) : (
                      <span className="v2-gris">—</span>
                    )}
                    {l.courriel ? (
                      <a href={`mailto:${l.courriel}`} className="om-p-sous om-courriel">
                        {l.courriel}
                      </a>
                    ) : null}
                  </td>
                  <td>
                    <select className="om-choix" data-teinte={teinte(l.statut)} value={l.statut} onChange={(e) => maj(l.id, "statut", e.target.value)} aria-label={`Statut de ${l.entreprise}`}>
                      {STATUTS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="om-note-cellule">
                    <Note valeur={l.note ?? ""} onValider={(v) => maj(l.id, "note", v)} />
                  </td>
                  <td>
                    {ajoutes.includes(l.id) ? (
                      <Link href="/omega/contacts" className="v2-val-bouton">
                        Dans les contacts
                      </Link>
                    ) : (
                      <button type="button" className="v2-val-bouton" onClick={() => versContact(l)} title="Suivre cette entreprise dans Contacts">
                        + Contact
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav className="om-pagination" aria-label="Pages">
          {page > 1 ? (
            <Link href={lien({ page: String(page - 1) })} className="v2-val-bouton">
              <ChevronLeft width={14} height={14} aria-hidden="true" /> Précédente
            </Link>
          ) : (
            <span />
          )}
          <span className="v2-gris">
            Page {page} sur {pages}
          </span>
          {page < pages ? (
            <Link href={lien({ page: String(page + 1) })} className="v2-val-bouton">
              Suivante <ChevronRight width={14} height={14} aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>
      <p className="v2-gris om-note">Un professionnel peut être appelé (Bloctel ne protège que les particuliers), mais un « non » est définitif : statut « Ne plus contacter ». Sobriété avec les entrepreneurs individuels (RGPD).</p>
    </div>
  );
}

/* la carte à jauge en pastilles de /espace2 */
function Jauge({ icone: Icone, titre, fort, faible, part, pied }: { icone: typeof Phone; titre: string; fort: string; faible: string; part: number; pied: string }) {
  const N = 40;
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * N);
  return (
    <div className="v2-dr-carte v2-dr-jauge">
      <span className="v2-dr-jauge-tete">
        <Icone width={18} height={18} aria-hidden="true" /> {titre}
      </span>
      <span className="v2-dr-jauge-valeur">
        <strong>
          <Chiffre valeur={fort} />
        </strong>
        {faible}
      </span>
      <span className="v2-dr-jauge-barre" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <i key={i} data-plein={i < pleins ? "" : undefined} />
        ))}
      </span>
      <small>{pied}</small>
    </div>
  );
}

function Note({ valeur, onValider }: { valeur: string; onValider: (v: string) => void }) {
  const [v, setV] = useState(valeur);
  return <textarea className="om-cellule" rows={1} value={v} placeholder="Ajouter une note" aria-label="Note" onChange={(e) => setV(e.target.value)} onBlur={() => v.trim() !== valeur && onValider(v.trim())} />;
}
