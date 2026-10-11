"use client";

/* ══════════════════════════════════════════════════════════════════════
   « À valider » et « Point du matin » du pilotage (09/10/2026)

   DUPLIQUÉS de components/espace2/Validations.tsx et Point.tsx — mêmes
   classes (v2-val-*, v2-pm-*), même disposition : la barre de filtres en
   menus, la file groupée par échéance avec cases et décision en lot, la
   fiche à droite ; les cartes du point du matin. Le contenu est celui du
   tableau opérationnel (omega_lignes) : une case cochée = « Fait » en base.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Choix from "./Choix";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, CircleCheck, CircleDashed, Clock, Compass, FileText, Inbox, LayoutGrid, ListChecks, ListFilter, Megaphone, MoreVertical, Repeat, Search, UserRound, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Ligne } from "./Tableaux";

const R = "/omega";
const JOUR = 86_400_000;
const FINIS = ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel", "Perdu"];
const ICONE_CATEGORIE: Record<string, typeof FileText> = { Fondations: Compass, Pilotage: ListChecks, Prospection: UserRound, Contenu: Megaphone, Clients: UserRound, Audits: ListChecks, Pub: Megaphone };

function echeance(texte: string | undefined): number | null {
  const m = texte?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const mois = Number(m[2]);
  return new Date(mois >= 10 ? 2026 : 2027, mois - 1, Number(m[1]), 23, 59).getTime();
}
const quand = (t: number | null, maintenant: number) => {
  if (t === null) return "";
  if (t < maintenant) return `En retard de ${Math.max(1, Math.ceil((maintenant - t) / JOUR))} j`;
  const j = Math.floor((t - maintenant) / JOUR);
  if (j === 0) return "Aujourd'hui";
  if (j === 1) return "Demain";
  return new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

function useLignes(initiales: Ligne[]) {
  const [lignes, setLignes] = useState(initiales);
  async function marquer(l: Ligne, cle: string, valeur: string) {
    const donnees = { ...l.donnees, [cle]: valeur };
    const maj = new Date().toISOString();
    setLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, donnees, maj } : x)));
    await createClient().from("omega_lignes").update({ donnees, maj }).eq("id", l.id);
  }
  return { lignes, marquer };
}

/* le menu déroulant de la barre de filtres, comme dans /espace2 */
function Selecteur({ icone: Icone, valeur, changer, tous, options }: { icone: typeof FileText; valeur: string; changer: (v: string) => void; tous?: string; options: { cle: string; libelle: string }[] }) {
  return <Choix forme="bouton" etiquette={tous ?? "Vue"} icone={<Icone width={16} height={16} aria-hidden="true" />} valeur={valeur} onChange={changer} vide={tous} options={options} actif={!!valeur && !!tous} />;
}

export default function Journee({ mode, lignes }: { mode: "validations" | "point"; lignes: Ligne[] }) {
  return mode === "validations" ? <Validations initiales={lignes} /> : <Point initiales={lignes} />;
}

/* ══════════════════════════ À valider ══════════════════════════ */
const GROUPES = [
  { cle: "retard", libelle: "En retard" },
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "plus_tard", libelle: "Plus tard" },
] as const;

function Validations({ initiales }: { initiales: Ligne[] }) {
  const { lignes, marquer } = useLignes(initiales);
  const [maintenant] = useState(() => Date.now());
  const [vue, setVue] = useState("a_decider");
  const [categorie, setCategorie] = useState("");
  const [periode, setPeriode] = useState("");
  const [recherche, setRecherche] = useState<string | null>(null);
  const [coches, setCoches] = useState<string[]>([]);
  const [choix, setChoix] = useState<string | null>(null);

  const groupe = (l: Ligne) => {
    const e = echeance(l.donnees["Échéance"]) ?? Infinity;
    return e < maintenant ? "retard" : e < maintenant + 7 * JOUR ? "semaine" : "plus_tard";
  };
  const taches = lignes.filter((l) => l.tableau === "plan" || l.tableau === "ajouts");
  const categories = Array.from(new Set(taches.map((l) => l.donnees["Catégorie"]).filter(Boolean)));
  const visibles = taches
    .filter((l) => (vue === "a_decider" ? l.donnees["Statut"] !== "Fait" && ["Fondations", "Pilotage"].includes(l.donnees["Catégorie"]) : vue === "a_faire" ? l.donnees["Statut"] !== "Fait" : vue === "faites" ? l.donnees["Statut"] === "Fait" : true))
    .filter((l) => !categorie || l.donnees["Catégorie"] === categorie)
    .filter((l) => !periode || groupe(l) === periode)
    .filter((l) => !recherche || (l.donnees["Tâche"] ?? "").toLowerCase().includes(recherche.toLowerCase()))
    .sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 9e15) - (echeance(b.donnees["Échéance"]) ?? 9e15));
  const groupes = new Map<string, Ligne[]>();
  for (const l of visibles) {
    const g = l.donnees["Statut"] === "Fait" ? "faites" : groupe(l);
    groupes.set(g, [...(groupes.get(g) ?? []), l]);
  }
  const choisie = visibles.find((l) => l.id === choix) ?? visibles.find((l) => l.donnees["Statut"] !== "Fait") ?? null;
  const bloquants = lignes.filter((l) => l.tableau === "moteurs" && l.donnees["Statut"] !== "Fait").slice(0, 5);
  const cochees = visibles.filter((l) => coches.includes(l.id));

  return (
    <div className="v2-page v2-arrivee v2-val v2-vivant">
      <h1 className="v2-sr">À valider</h1>
      <div className="v2-val-filtres">
        <Selecteur icone={Inbox} valeur={vue} changer={setVue} options={[{ cle: "a_decider", libelle: "Tes décisions" }, { cle: "a_faire", libelle: "Toutes les tâches à faire" }, { cle: "faites", libelle: "Faites" }, { cle: "toutes", libelle: "Toutes" }]} />
        <Selecteur icone={LayoutGrid} valeur={categorie} changer={setCategorie} tous="Toutes les catégories" options={categories.map((c) => ({ cle: c, libelle: c }))} />
        <Selecteur icone={CalendarDays} valeur={periode} changer={setPeriode} tous="Toutes les échéances" options={GROUPES.map((g) => ({ cle: g.cle, libelle: g.libelle }))} />
        <span className="v2-val-droite">
          {recherche !== null ? (
            <span className="v2-val-recherche">
              <Search width={16} height={16} aria-hidden="true" />
              <input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher une tâche…" aria-label="Rechercher une tâche" />
              <button type="button" className="v2-val-icone" aria-label="Fermer la recherche" onClick={() => setRecherche(null)}>
                <X width={14} height={14} />
              </button>
            </span>
          ) : (
            <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Rechercher" onClick={() => setRecherche("")}>
              <Search width={16} height={16} />
            </button>
          )}
        </span>
      </div>

      {cochees.length ? (
        <div className="v2-val-lot" role="group" aria-label="Décision en lot">
          <span>
            {cochees.length} tâche{cochees.length > 1 ? "s" : ""} cochée{cochees.length > 1 ? "s" : ""}
          </span>
          <span className="v2-val-actions">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome" onClick={() => setCoches([])}>
              Annuler
            </button>
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => { cochees.forEach((l) => marquer(l, "Statut", "Bloqué")); setCoches([]); }}>
              Bloquées ({cochees.length})
            </button>
            <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => { cochees.forEach((l) => marquer(l, "Statut", "Fait")); setCoches([]); }}>
              Faites ({cochees.length})
            </button>
          </span>
        </div>
      ) : null}

      <div className="v2-val-grille">
        <div className="v2-val-col">
          {visibles.length === 0 ? (
            <div className="v2-carte v2-val-vide">{vue === "a_decider" ? "Aucune décision ne t'attend pour l'instant." : "Aucune tâche ne correspond à ces filtres."}</div>
          ) : (
            [...GROUPES, { cle: "faites", libelle: "Faites" }].map((g) => {
              const liste = groupes.get(g.cle);
              if (!liste?.length) return null;
              return (
                <section key={g.cle} className="v2-carte" aria-label={g.libelle}>
                  <h2 className="v2-val-groupe">{g.libelle}</h2>
                  <ul className="v2-val-liste">
                    {liste.map((l) => {
                      const Icone = ICONE_CATEGORIE[l.donnees["Catégorie"]] ?? FileText;
                      const e = echeance(l.donnees["Échéance"]);
                      return (
                        <li key={l.id} className="v2-val-ligne" aria-current={choisie?.id === l.id ? "true" : undefined}>
                          <span className="v2-val-case">
                            <input type="checkbox" checked={coches.includes(l.id)} disabled={l.donnees["Statut"] === "Fait"} aria-label={`Cocher : ${l.donnees["Tâche"]}`} onChange={(ev) => setCoches((c) => (ev.target.checked ? [...c, l.id] : c.filter((x) => x !== l.id)))} />
                          </span>
                          <button type="button" className="v2-val-corps" onClick={() => setChoix(l.id)}>
                            <span className="v2-val-texte">
                              <span>{l.donnees["Tâche"]}</span>
                              <small>{[l.donnees["Catégorie"], l.donnees["Semaine"], l.donnees["Statut"]].filter(Boolean).join(" · ")}</small>
                            </span>
                            <span className="v2-val-module" aria-hidden="true">
                              <Icone width={20} height={20} />
                            </span>
                            <span className="v2-val-montant">
                              <span>{l.donnees["Échéance"] ?? "—"}</span>
                              <small data-retard={l.donnees["Statut"] !== "Fait" && e !== null && e < maintenant ? "" : undefined}>{l.donnees["Statut"] === "Fait" ? "Fait" : quand(e, maintenant)}</small>
                            </span>
                            <ChevronRight width={16} height={16} aria-hidden="true" className="v2-val-chevron" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <div className="v2-val-col v2-val-cote">
          <section className="v2-carte" aria-label="La décision">
            <h2 className="v2-val-groupe">La décision</h2>
            {choisie ? (
              <div className="v2-val-circuit">
                <div>
                  <p className="v2-val-circuit-titre">{choisie.donnees["Tâche"]}</p>
                  <p className="v2-val-gris">
                    {[choisie.donnees["Catégorie"], choisie.donnees["Semaine"], choisie.donnees["Échéance"] ? `échéance ${choisie.donnees["Échéance"]}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ol className="v2-val-etapes">
                  {["À faire", "En cours", "Fait"].map((s, i) => {
                    const rang = ["À faire", "En cours", "Fait"].indexOf(choisie.donnees["Statut"] ?? "À faire");
                    const passe = i <= rang;
                    return (
                      <li key={s} data-attente={passe ? undefined : ""}>
                        <span className="v2-val-etape-icone">{passe ? <CircleCheck width={18} height={18} /> : <CircleDashed width={18} height={18} />}</span>
                        <span>
                          <span className="v2-val-etape-nom">{s}</span>
                          <small className="v2-val-gris">{passe ? (i === rang ? "Étape actuelle" : "Passée") : "À venir"}</small>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div className="om-decision-actions">
                  <button type="button" className="v2-btn v2-btn--petit" onClick={() => marquer(choisie, "Statut", "En cours")}>
                    En cours
                  </button>
                  <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => marquer(choisie, "Statut", "Fait")}>
                    Marquer faite
                  </button>
                </div>
                <Link href={`${R}/taches`} className="v2-val-lien">
                  Voir tout le plan <ArrowRight width={16} height={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="v2-val-gris v2-val-pad">Choisis une tâche pour voir où elle en est.</p>
            )}
          </section>

          <section className="v2-carte" aria-label="Ce qui bloque un client">
            <h2 className="v2-val-groupe">Ce qui bloque un client</h2>
            {bloquants.length ? (
              <ul className="v2-val-delegations">
                {bloquants.map((l) => (
                  <li key={l.id}>
                    <Wrench width={18} height={18} aria-hidden="true" />
                    <span className="v2-val-texte">
                      <span>{l.donnees["Chantier"]}</span>
                      <small>{[l.donnees["Échéance"], l.donnees["Statut"]].filter(Boolean).join(" · ")}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-val-gris v2-val-pad">Aucun chantier en attente.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ Point du matin ══════════════════════════ */
function Point({ initiales }: { initiales: Ligne[] }) {
  const { lignes, marquer } = useLignes(initiales);
  const [maintenant] = useState(() => Date.now());
  const [filtre, setFiltre] = useState("");

  const c = useMemo(() => {
    const taches = lignes.filter((l) => (l.tableau === "plan" || l.tableau === "ajouts") && l.donnees["Statut"] !== "Fait").filter((l) => !filtre || l.donnees["Catégorie"] === filtre);
    const premier = taches.filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant + JOUR).sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 0) - (echeance(b.donnees["Échéance"]) ?? 0));
    const semaine = taches.filter((l) => {
      const e = echeance(l.donnees["Échéance"]) ?? Infinity;
      return e >= maintenant + JOUR && e < maintenant + 7 * JOUR;
    });
    const depuis = lignes.filter((l) => l.maj && new Date(l.maj).getTime() > maintenant - JOUR).sort((a, b) => (b.maj ?? "").localeCompare(a.maj ?? ""));
    const routines = lignes.filter((l) => l.tableau === "routines" && /jour/i.test(l.donnees["Fréquence"] ?? ""));
    const relances = lignes.filter((l) => l.tableau === "clients" && l.donnees["Client"] && !FINIS.includes(l.donnees["Étape"]));
    const moteurs = lignes.filter((l) => l.tableau === "moteurs" && l.donnees["Statut"] !== "Fait").slice(0, 4);
    const categories = Array.from(new Set(lignes.filter((l) => l.tableau === "plan" || l.tableau === "ajouts").map((l) => l.donnees["Catégorie"]).filter(Boolean)));
    return { premier, semaine, depuis, routines, relances, moteurs, categories };
  }, [lignes, filtre, maintenant]);

  const jour = new Date(maintenant).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="v2-page v2-arrivee v2-pm v2-vivant">
      <h1 className="v2-sr">Point du matin</h1>
      <div className="v2-val-filtres">
        <label className="v2-val-bouton">
          <CalendarDays width={16} height={16} aria-hidden="true" />
          <span suppressHydrationWarning>{jour.charAt(0).toUpperCase() + jour.slice(1)}</span>
        </label>
        <span className="v2-val-bouton">
          <Clock width={16} height={16} aria-hidden="true" />
          <span>7 h 00</span>
        </span>
        <Selecteur icone={LayoutGrid} valeur={filtre} changer={setFiltre} tous="Toutes les catégories" options={c.categories.map((x) => ({ cle: x, libelle: x }))} />
        <span className="v2-val-droite">
          <span className="v2-pm-remise">Ton point du jour</span>
        </span>
      </div>

      <div className="v2-pm-grille">
        <Carte titre="À regarder en premier" classe="v2-pm-large" lien={`${R}/validations`} badge={c.premier.length ? String(c.premier.length) : undefined}>
          {c.premier.length ? (
            <ul className="v2-pm-liste">
              {c.premier.map((l) => {
                const e = echeance(l.donnees["Échéance"]);
                const retard = e !== null && e < maintenant;
                const Icone = ICONE_CATEGORIE[l.donnees["Catégorie"]] ?? FileText;
                return (
                  <li key={l.id}>
                    <span className="v2-pm-icone" data-critique={retard ? "" : undefined}>
                      <Icone width={22} height={22} aria-hidden="true" />
                    </span>
                    <span className="v2-pm-texte">
                      <span>{l.donnees["Tâche"]}</span>
                      <small>{[l.donnees["Catégorie"], quand(e, maintenant)].filter(Boolean).join(" · ")}</small>
                    </span>
                    <button type="button" className="v2-pm-action" onClick={() => marquer(l, "Statut", "Fait")}>
                      Fait <CircleCheck width={14} height={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="v2-pm-rien">Rien d&apos;urgent ce matin.</p>
          )}
        </Carte>

        <Carte titre="Depuis hier" lien={`${R}/taches`}>
          {c.depuis.length ? (
            <ul className="v2-pm-liste">
              {c.depuis.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <span className="v2-pm-icone">{l.tableau === "clients" ? <UserRound width={22} height={22} aria-hidden="true" /> : <ListChecks width={22} height={22} aria-hidden="true" />}</span>
                  <span className="v2-pm-texte">
                    <span>{l.donnees["Tâche"] ?? l.donnees["Client"] ?? l.donnees["Chantier"] ?? l.donnees["Routine"] ?? "Ligne modifiée"}</span>
                    <small>{l.donnees["Statut"] ?? l.donnees["Étape"] ?? l.donnees["Statut cette semaine"] ?? ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v2-pm-rien">Rien de nouveau depuis hier.</p>
          )}
        </Carte>

        <Carte titre="Prospects à relancer" lien={`${R}/demandes`} pied={{ libelle: "Voir dans Demandes reçues", href: `${R}/demandes` }}>
          {c.relances.length ? (
            <ul className="v2-pm-liste">
              {c.relances.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <UserRound width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                  <span className="v2-pm-texte">
                    <span>{l.donnees["Client"]}</span>
                    <small>{[l.donnees["Étape"], l.donnees["Prochaine action"]].filter(Boolean).join(" · ")}</small>
                  </span>
                  <Link href={`${R}/demandes`} className="v2-pm-action" aria-label={`Ouvrir ${l.donnees["Client"]}`}>
                    {l.donnees["Date"] || "Ouvrir"} <ArrowUpRight width={14} height={14} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v2-pm-rien">Aucun prospect en cours.</p>
          )}
        </Carte>

        <Carte titre="Routines du jour" lien={`${R}/taches/routines`} pied={{ libelle: "Toutes les routines", href: `${R}/taches/routines` }}>
          <ul className="v2-pm-liste">
            {c.routines.map((l) => {
              const fait = l.donnees["Statut cette semaine"] === "Fait";
              return (
                <li key={l.id}>
                  <Repeat width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                  <span className="v2-pm-texte">
                    <span>{l.donnees["Routine"]}</span>
                    <small>{l.donnees["Moment"]}</small>
                  </span>
                  <button type="button" className="v2-pm-action" onClick={() => marquer(l, "Statut cette semaine", fait ? "À faire" : "Fait")}>
                    {fait ? "Fait" : "À faire"} {fait ? <CircleCheck width={14} height={14} aria-hidden="true" /> : <CircleDashed width={14} height={14} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Carte>

        <Carte titre="Cette semaine" lien={`${R}/taches`} pied={{ libelle: "Voir le plan", href: `${R}/taches` }}>
          {c.semaine.length ? (
            <ul className="v2-pm-liste">
              {c.semaine.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <ListFilter width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                  <span className="v2-pm-texte">
                    <span>{l.donnees["Tâche"]}</span>
                    <small>{[l.donnees["Catégorie"], `échéance ${l.donnees["Échéance"]}`].join(" · ")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v2-pm-rien">Rien d&apos;autre cette semaine.</p>
          )}
        </Carte>

        <Carte titre="Chantiers des moteurs" classe="v2-pm-large" lien={`${R}/automatisations`} pied={{ libelle: "Voir les chantiers", href: `${R}/automatisations` }}>
          {c.moteurs.length ? (
            <ul className="v2-pm-liste">
              {c.moteurs.map((l) => (
                <li key={l.id}>
                  <Wrench width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                  <span className="v2-pm-texte">
                    <span>{l.donnees["Chantier"]}</span>
                    <small>{[l.donnees["Pourquoi"], l.donnees["Échéance"]].filter(Boolean).join(" · ")}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="v2-pm-rien">Aucun chantier en attente.</p>
          )}
        </Carte>
      </div>
    </div>
  );
}

function Carte({ titre, classe, lien, badge, pied, children }: { titre: string; classe?: string; lien?: string; badge?: string; pied?: { libelle: string; href: string }; children: React.ReactNode }) {
  return (
    <section className={`v2-carte v2-pm-carte${classe ? ` ${classe}` : ""}`} aria-label={titre}>
      <div className="v2-pm-tete">
        <h2>{titre}</h2>
        {badge ? <span className="v2-pm-badge">{badge}</span> : null}
        {lien ? (
          <Link href={lien} className="v2-pm-kebab" aria-label={`Ouvrir : ${titre}`}>
            <MoreVertical width={16} height={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="v2-pm-corps">{children}</div>
      {pied ? (
        <div className="v2-pm-pied">
          <Link href={pied.href} className="v2-pm-action">
            {pied.libelle} <ArrowUpRight width={14} height={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
