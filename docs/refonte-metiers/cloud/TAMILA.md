# TAMILA (cabinets d'avocats) — dans le cloud

- Branche : `claude/copie-tamila`, tirée de `origin/refonte-metiers/aiguillage`.
- Code : `app/espace2/tamila/*`, `components/espace2/tamila/*` (préfixe `tam-`). Inventaire : `docs/refonte-metiers/tamila.md`. Découpage : `DECOUPAGES.md` § TAMILA.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Vue d'ensemble | `/espace2/tamila` | Linear, My issues | `linear-my-issues.md` |
| Arrivées | `/espace2/tamila/arrivees` | Linear, Triage | `linear-triage.md` |
| Dossier | `/espace2/tamila/dossiers/[id]` | Linear, page d'une Initiative | `linear-initiative.md` |
| Honoraires du cabinet | `/espace2/tamila/honoraires` | Plain, Accounts (ex-Tenants), liste | `plain-tenants.md` (+ `plain-commun.md`) |
| Pilotage | `/espace2/tamila/pilotage` | Plain, Insights | `plain-insights.md` |
| Conformité du cabinet | `/espace2/tamila/conformite` | Plain, Tasks | `plain-tasks.md` |
| Réglages | `/espace2/tamila/reglages` | Linear, Settings › Team | `linear-team-settings.md` |

## À savoir
- Une première version existe sur `origin/claude/metiers-tamila-28f177`, faite AVANT les règles du 01/11 (dessin habillé, cartes de l'ancien écran montées telles quelles). N'en reprends que la plomberie : le trousseau monté dans `app/espace2/tamila/layout.tsx` (`components/espace2/tamila/donnees.tsx`) pour que changer de sous-page ne redéchiffre rien et ne rouvre pas le coffre (journalisé), les règles d'aiguillage. Le dessin se refait entièrement à partir des relevés.
- Une liste ne charge pas les dossiers : seule la page d'un dossier l'ouvre (lecture tracée au journal).
