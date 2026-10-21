"use client";

/* Une collection de fiches que l'équipe tient à la main — tâches, notes,
   appels, entreprises, contacts (07/10/2026, d'après le menu d'Attio).

   Ce que ce n'est PAS : une base partagée. Les fiches sont gardées dans le
   navigateur de cet appareil (localStorage), et la page le dit en clair.
   Une collègue sur un autre ordinateur ne les voit pas. Le jour où elles
   passent en base, seul `lire`/`ecrire` change. */

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Note } from "./ui";
import { useToast } from "./Toasts";
import { jourDe } from "./filed/calculs";

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

  const [principal, ...autres] = champs;
  /* 15/10 — une ligne par fiche, comme Tâches et Appels du pilotage /omega :
     le titre, un détail court en gris, une seule date à droite (rouge si
     elle est passée pour une tâche ouverte) ; les textes longs passent en
     infobulle */
  const detail = autres.find((c) => !c.type || c.type === "tel" || c.type === "email");
  const date = autres.find((c) => c.type === "date");
  const longs = autres.filter((c) => c.type === "long");
  const aujourdhui = new Date().setHours(0, 0, 0, 0);

  return (
    <div className="v2-page v2-page--etroite v2-arrivee">
      <h1 className="v2-sr">{config.titre}</h1>
      {/* 15/10 — une barre fine (la recherche, l'ajout) puis une seule liste
         encadrée, comme Activité et le pilotage /omega */}
      <div className="oc-barre">
        <label className="v2-champ oc-barre-recherche">
          <Search width={16} height={16} aria-hidden="true" />
          <input placeholder="Rechercher…" value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label={`Rechercher : ${config.titre}`} />
        </label>
        <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
          <Plus width={16} height={16} aria-hidden="true" /> Ajouter {config.une}
        </button>
      </div>

      {ouvert ? (
        <form className="v2-carte" onSubmit={ajouter} style={{ marginBottom: 24 }}>
          <div className="v2-carte-corps" style={{ display: "grid", gap: 12 }}>
            {champs.map((c) => (
              <label key={c.cle} style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <span className="v2-gris">{c.libelle}</span>
                {c.type === "long" ? (
                  <span className="v2-champ" style={{ height: "auto", padding: 12 }}>
                    <textarea name={c.cle} rows={4} required={c.requis} style={{ flex: 1, border: 0, outline: 0, background: "transparent", color: "inherit", font: "inherit", resize: "vertical" }} />
                  </span>
                ) : (
                  <span className="v2-champ">
                    <input name={c.cle} required={c.requis} type={c.type === "date" ? "date" : c.type === "email" ? "email" : c.type === "tel" ? "tel" : "text"} />
                  </span>
                )}
              </label>
            ))}
          </div>
          <div className="v2-carte-pied">
            <span>Enregistré sur cet appareil.</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" className="v2-btn v2-btn--petit" onClick={() => setOuvert(false)}>
                Annuler
              </button>
              <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire">
                Enregistrer
              </button>
            </span>
          </div>
        </form>
      ) : null}

      {fiches === null ? null : visibles.length === 0 ? (
        <div className="v2-carte v2-carte-corps">
          <p className="v2-gris" style={{ margin: 0 }}>{filtre ? "Rien ne correspond à cette recherche." : `${config.vide} ${config.intro}`}</p>
        </div>
      ) : (
        <ul className="v2-carte v2-liste oc-collection">
          {visibles.map((f) => (
            <li key={f.id} className="v2-liste-item">
              {config.coche ? (
                <input
                  type="checkbox"
                  checked={!!f.fait}
                  aria-label={`Marquer « ${String(f[principal.cle])} » comme faite`}
                  onChange={() => maj((fiches ?? []).map((x) => (x.id === f.id ? { ...x, fait: !x.fait } : x)))}
                  style={{ width: 16, height: 16, flexShrink: 0 }}
                />
              ) : null}
              <span className="v2-liste-texte" title={longs.map((c) => String(f[c.cle] ?? "")).filter(Boolean).join("\n") || undefined}>
                <span style={f.fait ? { textDecoration: "line-through", color: "var(--v2-gray-900)" } : undefined}>
                  {String(f[principal.cle] || "—")}
                  {detail && f[detail.cle] ? <span className="oc-collection-detail"> {String(f[detail.cle])}</span> : null}
                </span>
              </span>
              {(() => {
                const v = date ? String(f[date.cle] ?? "") : "";
                const passee = !!v && config.coche && !f.fait && jourDe(v) < aujourdhui;
                return (
                  <span className="oc-meta" data-retard={passee ? "" : undefined}>
                    {v ? dateFr(v) : dateFr(f.cree)}
                    {passee ? <span className="v2-sr"> (en retard)</span> : null}
                  </span>
                );
              })()}
              <button
                type="button"
                className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome"
                aria-label={`Supprimer « ${String(f[principal.cle] || "")} »`}
                onClick={() => {
                  maj((fiches ?? []).filter((x) => x.id !== f.id));
                  toast("Supprimé");
                }}
              >
                <Trash2 width={16} height={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <Note>Ces fiches sont gardées dans le navigateur de cet appareil : vos collègues ne les voient pas encore depuis le leur.</Note>
      </div>
    </div>
  );
}
