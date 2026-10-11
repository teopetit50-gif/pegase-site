"use client";

/* ══════════════════════════════════════════════════════════════════════
   « À valider » et « Point du matin » du pilotage

   09/10/2026 : dupliqués de /espace2 (file filtrée + fiche à droite,
   six cartes du point du matin).
   11/10/2026 — retour de Teo : « trop surchargé, fais simple comme la
   page Notes ». Même squelette que Notes (simple.css) :
     · À valider : trois onglets (À décider, À faire, Faites), une barre
       (catégorie, recherche), la file en listes à plat par échéance ;
       la case ronde marque « Fait ». Plus de fiche à droite ni de
       « Ce qui bloque un client », plus de décision en lot.
     · Point du matin : trois listes — ce qui est dû aujourd'hui, les
       routines du jour, les prospects à relancer. Plus de « Depuis
       hier », « Cette semaine » ni « Chantiers des moteurs ».
   Le contenu reste celui du tableau opérationnel (omega_lignes).
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace2/notes.css";
import "./simple.css";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, LayoutGrid, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ItemMenu, MenuDeroulant } from "@/components/espace2/ui";
import type { Ligne } from "./Tableaux";

const R = "/omega";
const JOUR = 86_400_000;
const FINIS = ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel", "Perdu"];
const I = { width: 14, height: 14, strokeWidth: 1.6, "aria-hidden": true } as const;

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
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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

/* la case ronde : un clic coche (Fait), un second décoche */
function Case({ fait, libelle, onChange }: { fait: boolean; libelle: string; onChange: (fait: boolean) => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={fait} aria-label={libelle} className="si-case" onClick={() => onChange(!fait)}>
      <Check width={11} height={11} strokeWidth={3} aria-hidden="true" />
    </button>
  );
}

export default function Journee({ mode, lignes }: { mode: "validations" | "point"; lignes: Ligne[] }) {
  return mode === "validations" ? <Validations initiales={lignes} /> : <Point initiales={lignes} />;
}

/* ══════════════════════════ À valider ══════════════════════════ */
const GROUPES = [
  { cle: "retard", libelle: "En retard" },
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "plus_tard", libelle: "Plus tard" },
  { cle: "faites", libelle: "Faites" },
] as const;
type Onglet = "a_decider" | "a_faire" | "faites";

function Validations({ initiales }: { initiales: Ligne[] }) {
  const { lignes, marquer } = useLignes(initiales);
  const [maintenant] = useState(() => Date.now());
  const [onglet, setOnglet] = useState<Onglet>("a_decider");
  const [categorie, setCategorie] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const taches = lignes.filter((l) => l.tableau === "plan" || l.tableau === "ajouts");
  const fait = (l: Ligne) => l.donnees["Statut"] === "Fait";
  const dansOnglet: Record<Onglet, (l: Ligne) => boolean> = {
    a_decider: (l) => !fait(l) && ["Fondations", "Pilotage"].includes(l.donnees["Catégorie"]),
    a_faire: (l) => !fait(l),
    faites: fait,
  };
  const comptes = { a_decider: taches.filter(dansOnglet.a_decider).length, a_faire: taches.filter(dansOnglet.a_faire).length, faites: taches.filter(fait).length };
  const categories = Array.from(new Set(taches.map((l) => l.donnees["Catégorie"]).filter(Boolean))).sort();
  const q = sansAccents(recherche.trim());
  const visibles = taches
    .filter(dansOnglet[onglet])
    .filter((l) => !categorie || l.donnees["Catégorie"] === categorie)
    .filter((l) => !q || sansAccents(l.donnees["Tâche"] ?? "").includes(q))
    .sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 9e15) - (echeance(b.donnees["Échéance"]) ?? 9e15));
  const groupe = (l: Ligne) => {
    if (fait(l)) return "faites";
    const e = echeance(l.donnees["Échéance"]) ?? Infinity;
    return e < maintenant ? "retard" : e < maintenant + 7 * JOUR ? "semaine" : "plus_tard";
  };

  return (
    <div className="no-page si-page v2-arrivee">
      <h1 className="v2-sr">À valider</h1>
      <div className="no-onglets" role="tablist" aria-label="Ce qui t'attend">
        {(
          [
            ["a_decider", "À décider"],
            ["a_faire", "À faire"],
            ["faites", "Faites"],
          ] as const
        ).map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle} className="no-onglet" onClick={() => setOnglet(cle)}>
            {libelle}
            <span className="no-compte">{comptes[cle]}</span>
          </button>
        ))}
      </div>
      <div className="no-barre">
        <MenuDeroulant
          etiquette="Filtrer par catégorie"
          classe="no-bouton"
          placement="bottom start"
          largeur={220}
          declencheur={
            <>
              <LayoutGrid {...I} />
              {categorie ?? "Toutes les catégories"}
              <ChevronDown {...I} />
            </>
          }
        >
          <ItemMenu id="toutes" onAction={() => setCategorie(null)} suffixe={!categorie ? <Check {...I} /> : null}>
            Toutes les catégories
          </ItemMenu>
          {categories.map((c) => (
            <ItemMenu key={c} id={c} textValue={c} onAction={() => setCategorie(c)} suffixe={categorie === c ? <Check {...I} /> : null}>
              {c}
            </ItemMenu>
          ))}
        </MenuDeroulant>
        <div className="no-barre-droite">
          <label className="si-recherche">
            <Search {...I} />
            <span className="v2-sr">Rechercher une tâche</span>
            <input type="search" value={recherche} placeholder="Rechercher" onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setRecherche("")} />
          </label>
        </div>
      </div>

      {visibles.length === 0 ? (
        <section className="si-section">
          <p className="si-vide">{onglet === "a_decider" && !q && !categorie ? "Aucune décision ne t'attend pour l'instant." : "Rien ne correspond."}</p>
        </section>
      ) : (
        GROUPES.map((g) => {
          const liste = visibles.filter((l) => groupe(l) === g.cle);
          if (!liste.length) return null;
          return (
            <section key={g.cle} className="si-section" aria-label={g.libelle}>
              <div className="si-tete">
                <h2>{g.libelle}</h2>
                <span className="no-compte">{liste.length}</span>
              </div>
              <ul className="si-liste">
                {liste.map((l) => {
                  const e = echeance(l.donnees["Échéance"]);
                  const statut = l.donnees["Statut"];
                  return (
                    <li key={l.id} className="si-ligne" data-fait={fait(l) ? "" : undefined}>
                      <Case fait={fait(l)} libelle={`${l.donnees["Tâche"]} : fait`} onChange={(f) => marquer(l, "Statut", f ? "Fait" : "À faire")} />
                      <Link href={`${R}/taches`} className="si-texte">
                        <strong>{l.donnees["Tâche"]}</strong>
                        <span>{[l.donnees["Catégorie"], statut === "Bloqué" || statut === "En cours" ? statut : null].filter(Boolean).join(" · ")}</span>
                      </Link>
                      {!fait(l) && statut !== "En cours" ? (
                        <button type="button" className="si-action" onClick={() => marquer(l, "Statut", "En cours")}>
                          En cours
                        </button>
                      ) : null}
                      <span className="si-meta" data-retard={!fait(l) && e !== null && e < maintenant ? "" : undefined}>
                        {fait(l) ? l.donnees["Échéance"] : quand(e, maintenant)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

/* ══════════════════════════ Point du matin ══════════════════════════ */
function Point({ initiales }: { initiales: Ligne[] }) {
  const { lignes, marquer } = useLignes(initiales);
  const [maintenant] = useState(() => Date.now());
  /* une tâche cochée ce matin reste dans la liste, barrée, jusqu'au prochain passage */
  const [faitesIci, setFaitesIci] = useState<string[]>([]);

  const c = useMemo(() => {
    const dues = lignes
      .filter((l) => (l.tableau === "plan" || l.tableau === "ajouts") && (l.donnees["Statut"] !== "Fait" || faitesIci.includes(l.id)))
      .filter((l) => (echeance(l.donnees["Échéance"]) ?? Infinity) < maintenant + JOUR)
      .sort((a, b) => (echeance(a.donnees["Échéance"]) ?? 0) - (echeance(b.donnees["Échéance"]) ?? 0));
    const routines = lignes.filter((l) => l.tableau === "routines" && /jour/i.test(l.donnees["Fréquence"] ?? ""));
    const relances = lignes.filter((l) => l.tableau === "clients" && l.donnees["Client"] && !FINIS.includes(l.donnees["Étape"]));
    return { dues, routines, relances };
  }, [lignes, maintenant, faitesIci]);
  const jour = new Date(maintenant).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="no-page si-page v2-arrivee">
      <h1 className="v2-sr">Point du matin</h1>
      <div className="no-barre">
        <p className="si-date" suppressHydrationWarning>
          {jour}
        </p>
        <Link href={`${R}/taches`} className="si-lien">
          Voir le plan <ArrowRight {...I} />
        </Link>
      </div>

      <section className="si-section" aria-label="À faire aujourd'hui">
        <div className="si-tete">
          <h2>À faire aujourd&apos;hui</h2>
          <span className="no-compte">{c.dues.filter((l) => !faitesIci.includes(l.id)).length}</span>
        </div>
        {c.dues.length ? (
          <ul className="si-liste">
            {c.dues.map((l) => {
              const e = echeance(l.donnees["Échéance"]);
              const coche = faitesIci.includes(l.id);
              return (
                <li key={l.id} className="si-ligne" data-fait={coche ? "" : undefined}>
                  <Case
                    fait={coche}
                    libelle={`${l.donnees["Tâche"]} : fait`}
                    onChange={(f) => {
                      setFaitesIci((x) => (f ? [...x, l.id] : x.filter((y) => y !== l.id)));
                      void marquer(l, "Statut", f ? "Fait" : "À faire");
                    }}
                  />
                  <Link href={`${R}/taches`} className="si-texte">
                    <strong>{l.donnees["Tâche"]}</strong>
                    <span>{l.donnees["Catégorie"]}</span>
                  </Link>
                  <span className="si-meta" data-retard={!coche && e !== null && e < maintenant ? "" : undefined}>
                    {quand(e, maintenant)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="si-vide">Rien d&apos;urgent ce matin.</p>
        )}
      </section>

      <div className="si-deux">
        <section className="si-section" aria-label="Routines du jour">
          <div className="si-tete">
            <h2>Routines du jour</h2>
            <Link href={`${R}/taches/routines`} className="si-lien">
              Toutes
            </Link>
          </div>
          {c.routines.length ? (
            <ul className="si-liste">
              {c.routines.map((l) => {
                const fait = l.donnees["Statut cette semaine"] === "Fait";
                return (
                  <li key={l.id} className="si-ligne" data-fait={fait ? "" : undefined}>
                    <Case fait={fait} libelle={`${l.donnees["Routine"]} : fait`} onChange={(f) => marquer(l, "Statut cette semaine", f ? "Fait" : "À faire")} />
                    <span className="si-texte">
                      <strong>{l.donnees["Routine"]}</strong>
                    </span>
                    <span className="si-meta">{l.donnees["Moment"]}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="si-vide">Aucune routine quotidienne.</p>
          )}
        </section>

        <section className="si-section" aria-label="Prospects à relancer">
          <div className="si-tete">
            <h2>Prospects à relancer</h2>
            <Link href={`${R}/demandes`} className="si-lien">
              Tous
            </Link>
          </div>
          {c.relances.length ? (
            <ul className="si-liste">
              {c.relances.slice(0, 6).map((l) => (
                <li key={l.id} className="si-ligne">
                  <Link href={`${R}/demandes`} className="si-texte">
                    <strong>{l.donnees["Client"]}</strong>
                    <span>{l.donnees["Prochaine action"] || l.donnees["Étape"]}</span>
                  </Link>
                  <span className="si-meta">{l.donnees["Date"]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="si-vide">Aucun prospect en cours.</p>
          )}
        </section>
      </div>
    </div>
  );
}
