import { CIRCUITS_FIGURE } from "@/lib/produits/accueil";

/* ══════════════════════════════════════════════════════════════════════
   Le schéma du tri, écrit en HTML plutôt qu'en SVG.

   Pourquoi pas du SVG : un texte dans un `viewBox` de 1160 se réduit avec
   lui — à 390 px les libellés tombent à 5 px et la figure devient un
   décor illisible. En HTML, la géométrie se met à l'échelle et la
   typographie reste à sa taille.

   Il montre un MÉCANISME, pas des données : rien n'est mesuré chez un
   client, et il porte la mention « schéma ».
   ══════════════════════════════════════════════════════════════════════ */

/** Le tri : deux canaux entrent, la qualification range, quatre circuits
 *  sortent — dont deux qui passent la main au patron. */
export function SchemaCircuits() {
  const { entrees, sorties, mention } = CIRCUITS_FIGURE;

  return (
    <figure className="m-0 w-full rounded-2xl border border-neutral-200/80 bg-white p-5 a-ombre-integration sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        {/* Entrées */}
        <div className="flex shrink-0 gap-2 lg:w-32 lg:flex-col">
          {entrees.map((e) => (
            <span
              key={e}
              className="flex-1 rounded-lg bg-neutral-100 px-3 py-2 text-center font-mono text-[11px] uppercase text-neutral-600 lg:text-left"
            >
              {e}
            </span>
          ))}
        </div>

        {/* Le nœud */}
        <div className="relative flex items-center justify-center lg:flex-1">
          <span className="hidden h-px flex-1 bg-neutral-200 lg:block" />
          <span className="rounded-full border border-neutral-900 px-4 py-2 font-mono text-[11px] uppercase text-neutral-900">
            {CIRCUITS_FIGURE.noeud}
          </span>
          <span className="hidden h-px flex-1 bg-neutral-200 lg:block" />
        </div>

        {/* Sorties.

            ÉCART MOBILE ASSUMÉ — une colonne sous 640. Relevé le
            11/09/2026 à 390 px : à deux colonnes, chaque pastille reçoit
            147 px utiles, et « RENSEIGNEMENT RÉPONDU » en mono 11 px
            capitales en demande 169. Les trois libellés longs sortaient
            donc de leur fond — « RÉPONDU » peint à côté de la pastille,
            « TRANSFÉRÉE » amputé de sa dernière lettre par la pastille
            voisine. Le parent ne rogne pas, donc aucun contrôle de
            débordement ne le signalait : ça ne se voyait qu'à l'œil, sur
            une capture agrandie.
            Raccourcir les libellés était exclu — ce sont les quatre
            circuits, ils se disent en français entier. */}
        <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
          {sorties.map((s) => (
            <span
              key={s.nom}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 font-mono text-[11px] uppercase ${
                s.transfere ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {s.nom}
              <span className={s.transfere ? "text-white/60" : "text-neutral-400"}>{s.suite}</span>
            </span>
          ))}
        </div>
      </div>

      <figcaption className="mt-4 font-mono text-[10px] uppercase text-neutral-400">{mention}</figcaption>
    </figure>
  );
}
