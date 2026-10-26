"use client";

/* Une collection de fiches que l'équipe tient à la main — tâches, notes,
   appels, entreprises, contacts (07/10/2026, d'après le menu d'Attio).

   Ce que ce n'est PAS : une base partagée. Les fiches sont gardées dans le
   navigateur de cet appareil (localStorage), et la page le dit en clair.
   Une collègue sur un autre ordinateur ne les voit pas. Le jour où elles
   passent en base, seul `lire`/`ecrire` change. */

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "./Toasts";
import { jourDe } from "./filed/calculs";
import { SbRecherche } from "./sb/Sb";
import { SbDonnees } from "./sb/Donnees";

export type Champ = {
  cle: string;
  libelle: string;
  type?: "texte" | "date" | "long" | "email" | "tel";
  requis?: boolean;
};

type Fiche = { id: string; cree: string; fait?: boolean } & Record<string, string | boolean | undefined>;

export type ConfigCollection = {
  cle: string;
  titre: string;
  intro: string;
  /** le libellé du bouton et du formulaire, au singulier (« une tâche ») */
  une: string;
  champs: Champ[];
  /** une case « fait » devant chaque fiche (tâches) */
  coche?: boolean;
  vide: string;
};

const prefixe = "espace2-collection-";

/** Une clé du localStorage, relue quand elle change (cet onglet ou un
    autre). `null` au rendu serveur et avant l'hydratation. */
export function useStockage(cle: string): string | null {
  return useSyncExternalStore(
    (maj) => {
      window.addEventListener(cle, maj);
      window.addEventListener("storage", maj);
      return () => {
        window.removeEventListener(cle, maj);
        window.removeEventListener("storage", maj);
      };
    },
    () => {
      try {
        return localStorage.getItem(cle) ?? "";
      } catch {
        return "";
      }
    },
    () => null,
  );
}

export function ecrireStockage(cle: string, valeur: string) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {}
  window.dispatchEvent(new Event(cle));
}

function analyser(brut: string | null): Fiche[] | null {
  if (brut === null) return null;
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}


/** Le nombre de fiches ouvertes d'une collection — pour le compteur de la barre. */
export function useOuvertes(cle: string): number {
  const fiches = analyser(useStockage(prefixe + cle));
  return fiches ? fiches.filter((f) => !f.fait).length : 0;
}

/* 21/10 — une date calendaire (« 2026-10-21 », le champ date) se lit en UTC : le même jour partout, et non la veille au soir en Guadeloupe */
const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: /^\d{4}-\d{2}-\d{2}$/.test(iso) ? "UTC" : undefined });
};

export default function Collection({ config }: { config: ConfigCollection }) {
  const { cle, champs } = config;
  const toast = useToast();
  const brut = useStockage(prefixe + cle);
  const fiches = useMemo(() => analyser(brut), [brut]);
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState("");

  const maj = (f: Fiche[]) => ecrireStockage(prefixe + cle, JSON.stringify(f));

  const ajouter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    const fiche: Fiche = { id: crypto.randomUUID(), cree: new Date().toISOString() };
    for (const c of champs) fiche[c.cle] = donnees.get(c.cle)?.toString().trim() ?? "";
    maj([fiche, ...(fiches ?? [])]);
    e.currentTarget.reset();
    setOuvert(false);
    toast("Enregistré", "vert");
  };

  const visibles = useMemo(() => {
    const q = filtre.toLowerCase();
    const liste = (fiches ?? []).filter((f) => !q || champs.some((c) => String(f[c.cle] ?? "").toLowerCase().includes(q)));
    /* les tâches faites passent en bas */
    return config.coche ? [...liste].sort((a, b) => Number(!!a.fait) - Number(!!b.fait)) : liste;
  }, [fiches, filtre, champs, config.coche]);

  const [principal] = champs;
  const date = champs.find((c) => c.type === "date");
  const courts = champs.filter((c) => c.type !== "long" && c.type !== "date");
  const aujourdhui = new Date().setHours(0, 0, 0, 0);
  const [choisie, setChoisie] = useState<string | null>(null);
  const fiche = visibles.find((f) => f.id === choisie) ?? null;
  const idForm = `ajout-${cle}`;

  /* 22/10 — le gabarit « Users » de Supabase (./sb/Donnees) : la barre
     d'outils (recherche, ajout), la grille des fiches, le volet de droite
     pour ajouter ou lire une fiche, le total collé en bas. */
  return (
    <SbDonnees
      titre={config.titre}
      outils={{
        gauche: <SbRecherche valeur={filtre} changer={setFiltre} placeholder="Rechercher…" etiquette={`Rechercher : ${config.titre}`} />,
        droite: (
          <button
            type="button"
            className="v2-btn v2-btn--primaire"
            onClick={() => {
              setChoisie(null);
              setOuvert((v) => !v);
            }}
            aria-expanded={ouvert}
          >
            <Plus width={14} height={14} aria-hidden="true" /> Ajouter {config.une}
          </button>
        ),
      }}
      colonnes={[...(config.coche ? ["Fait"] : []), ...courts.map((c) => c.libelle), date ? date.libelle : "Créée le", ""]}
      lignes={
        fiches === null
          ? null
          : visibles.map((f) => {
              const v = date ? String(f[date.cle] ?? "") : "";
              const passee = !!v && config.coche && !f.fait && jourDe(v) < aujourdhui;
              return {
                cle: f.id,
                choisie: f.id === choisie,
                ouvrir: () => {
                  setOuvert(false);
                  setChoisie(f.id === choisie ? null : f.id);
                },
                cellules: [
                  ...(config.coche
                    ? [
                        <input
                          key="fait"
                          type="checkbox"
                          checked={!!f.fait}
                          aria-label={`Marquer « ${String(f[principal.cle])} » comme faite`}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => maj((fiches ?? []).map((x) => (x.id === f.id ? { ...x, fait: !x.fait } : x)))}
                          style={{ width: 16, height: 16 }}
                        />,
                      ]
                    : []),
                  ...courts.map((c, i) =>
                    i === 0 ? (
                      <span key={c.cle} style={f.fait ? { textDecoration: "line-through", color: "var(--v2-gray-900)" } : undefined}>
                        {String(f[c.cle] || "—")}
                      </span>
                    ) : (
                      <span key={c.cle} className={c.type === "email" || c.type === "tel" ? "sb-mono" : "sb-gris"}>
                        {String(f[c.cle] || "—")}
                      </span>
                    ),
                  ),
                  <span key="date" className="sb-gris" style={passee ? { color: "var(--v2-red-900)" } : undefined}>
                    {v ? dateFr(v) : dateFr(f.cree)}
                    {passee ? <span className="v2-sr"> (en retard)</span> : null}
                  </span>,
                  <button
                    key="suppr"
                    type="button"
                    className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome"
                    aria-label={`Supprimer « ${String(f[principal.cle] || "")} »`}
                    onClick={(e) => {
                      e.stopPropagation();
                      maj((fiches ?? []).filter((x) => x.id !== f.id));
                      if (choisie === f.id) setChoisie(null);
                      toast("Supprimé");
                    }}
                  >
                    <Trash2 width={14} height={14} aria-hidden="true" />
                  </button>,
                ],
              };
            })
      }
      vide={filtre ? { titre: "Rien ne correspond", texte: "Aucune fiche ne correspond à cette recherche." } : { titre: config.vide, texte: config.intro }}
      total={`Total : ${visibles.length} ${visibles.length > 1 ? "fiches" : "fiche"} · gardées sur cet appareil, vos collègues ne les voient pas encore`}
      volet={
        ouvert
          ? {
              titre: `Ajouter ${config.une}`,
              fermer: () => setOuvert(false),
              contenu: (
                <form id={idForm} onSubmit={ajouter}>
                  {champs.map((c) => (
                    <label key={c.cle}>
                      {c.libelle}
                      {c.type === "long" ? (
                        <span className="v2-champ" style={{ height: "auto" }}>
                          <textarea name={c.cle} rows={4} required={c.requis} />
                        </span>
                      ) : (
                        <span className="v2-champ">
                          <input name={c.cle} required={c.requis} type={c.type === "date" ? "date" : c.type === "email" ? "email" : c.type === "tel" ? "tel" : "text"} />
                        </span>
                      )}
                    </label>
                  ))}
                  <p className="sb-texte">Enregistré sur cet appareil.</p>
                </form>
              ),
              pied: (
                <>
                  <button type="button" className="v2-btn" onClick={() => setOuvert(false)}>
                    Annuler
                  </button>
                  <button type="submit" form={idForm} className="v2-btn v2-btn--primaire">
                    Enregistrer
                  </button>
                </>
              ),
            }
          : fiche
            ? {
                titre: String(fiche[principal.cle] || config.titre),
                fermer: () => setChoisie(null),
                contenu: (
                  <>
                    {champs.map((c) => (
                      <div key={c.cle} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <h3>{c.libelle}</h3>
                        <p className="sb-texte--fort" style={{ whiteSpace: "pre-line" }}>
                          {c.type === "date" && fiche[c.cle] ? dateFr(String(fiche[c.cle])) : String(fiche[c.cle] || "—")}
                        </p>
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <h3>Créée le</h3>
                      <p>{dateFr(fiche.cree)}</p>
                    </div>
                  </>
                ),
              }
            : null
      }
    />
  );
}
