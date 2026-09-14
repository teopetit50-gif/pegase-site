import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   audit-log — le journal daté, en rail (11/09/2026)

   Reprise de `audit-log` (21st.dev) : une liste d'événements reliés par un
   rail vertical, chacun avec sa pastille d'icône, son horodatage, son
   auteur et ses étiquettes.

   Sert de média à la carte « Rien ne part sans vous » de /offres, à la
   place de la fausse fenêtre « File de validation » (`MediaValidation`,
   qui reste exporté et n'est plus appelé). Le gain n'est pas décoratif :
   la carte promet que rien ne part sans accord et que l'on choisit ensuite
   ce qui part seul — un journal daté avec l'auteur de chaque geste le
   MONTRE, une file d'attente ne montrait que l'attente.

   ——— deux amputations, et pourquoi elles ne sont pas des raccourcis ———

   1. LES FILTRES SONT PARTIS. Le composant d'origine importe
      `@/components/ui/audit-log-utils/filters` — un constructeur de
      filtres (opérateurs `contains` / `is_not_any_of`, options calculées
      depuis les items). Ce fichier n'a PAS été fourni avec le composant et
      il est introuvable sur le registre 21st.dev sans son auteur. Le
      réécrire aurait été inventer, pas intégrer. Avec eux partent
      `matchesFilter`, `uniqueOptions` et l'état React : le composant
      devient statique, donc rendu côté serveur.

   2. LES MENUS CONTEXTUELS SONT PARTIS. « Open record », « Review
      change », « Copy record ID » supposent un tableau de bord où l'on
      fait un clic droit. Sur une page de vente, personne n'essaiera — et
      ils auraient coûté `@radix-ui/react-context-menu` plus une frontière
      client. Le composant n'ajoute donc AUCUNE dépendance.

   ——— réencrage ————————————————————————————————————————————————————
   `bg-card`, `text-muted-foreground`, `bg-border` et le `border` nu ne
   valent rien sous `.offres` : le premier tombe sur le fond de page, et en
   Tailwind v4 `border` seul peint en `currentColor`. Tout passe par
   `--o-line`, `--o-soft` et les classes `o-*`.

   Le rail est calé sur la géométrie réelle et non sur le `left-[1.55rem]`
   de la source : padding 16 px + demi-pastille 10 px = 26 px, donc 25 px
   pour un trait de 1 px. À 1,55 rem (24,8 px) il tombait à côté des
   pastilles d'un demi-pixel — invisible à l'œil, visible en capture.
   ══════════════════════════════════════════════════════════════════════ */

export type EntreeJournal = {
  id: string;
  titre: string;
  description?: string;
  horodatage: string;
  auteur?: string;
  etiquette?: string;
  icone: ReactNode;
};

export function AuditLog({
  entrees,
  className = "",
}: {
  entrees: EntreeJournal[];
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] border border-[var(--o-line)] bg-[var(--o-soft)] ${className}`}
    >
      {entrees.map((e, i) => (
        <div key={e.id} className="relative flex gap-3 px-4 py-3.5">
          {/* le rail : il s'arrête à la dernière entrée, sinon il pend dans
              le vide sous la dernière pastille */}
          {i < entrees.length - 1 ? (
            <div
              aria-hidden
              className="absolute bottom-0 left-[25px] top-9 w-px bg-[var(--o-line)]"
            />
          ) : null}

          <div className="z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--o-line)] bg-white text-[var(--o-muted-strong)]">
            {e.icone}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="text-[12.5px] font-semibold text-[var(--o-text)]">
                {e.titre}
              </div>
              <div className="text-[11px] text-[var(--o-muted)]">{e.horodatage}</div>
            </div>

            {e.description ? (
              <div className="mt-1 text-[11.5px] leading-[1.55] text-[var(--o-muted)]">
                {e.description}
              </div>
            ) : null}

            {e.auteur || e.etiquette ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                {e.auteur ? (
                  <span className="font-medium text-[var(--o-muted-strong)]">
                    {e.auteur}
                  </span>
                ) : null}
                {e.etiquette ? (
                  <span className="rounded-full border border-[var(--o-line)] bg-white px-2 py-0.5 text-[var(--o-muted)]">
                    {e.etiquette}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AuditLog;
