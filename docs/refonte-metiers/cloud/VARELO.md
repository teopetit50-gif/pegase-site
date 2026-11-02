# VARELO (référentiel d'un groupe) — dans le cloud

- Branche : `claude/copie-varelo`, tirée de `origin/refonte-metiers/aiguillage`.
- Code : `app/espace2/varelo/*`, `components/espace2/varelo/*` (préfixe `var-`). Inventaire : `docs/refonte-metiers/varelo.md`. Découpage : `DECOUPAGES.md` § VARELO.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Ce matin | `/espace2/varelo` | Linear, accueil d'une équipe | `linear-home.md` |
| Référentiel | `/espace2/varelo/referentiel` | Attio, People et fiche d'un contact | `attio-people.md` |
| Finance | `/espace2/varelo/finance` | Plain, Insights | `plain-insights.md` |
| Contrats | `/espace2/varelo/contrats` | Plain, Accounts (ex-Tenants), liste et fiche | `plain-tenants.md` + `plain-tenant.md` |
| Opérations | `/espace2/varelo/operations` | Linear, Board | `linear-board.md` |
| Groupe | `/espace2/varelo/groupe` | Linear, liste des Initiatives | `linear-initiatives-liste.md` |
| Sources et structure | `/espace2/varelo/sources` | Linear, Settings › Integrations | `linear-integrations.md` |

## À savoir
- Ne pas déplacer `components/espace/varelo/csv.ts` : CASHD l'importe.
- Dans `components/espace/varelo/`, cinq modules ne diffèrent que par la casse (`contrats.ts` / `Contrats.tsx`, `encours`, `reciproques`, `reportings`, `reserves`) : sous Linux ça passe, mais ne crée pas d'autre paire de ce genre.
- Référentiel : la nature en haut, liste et fiche d'un objet, lots à côté de la liste, export. Fais-le en dernier (relevé Attio refait).
