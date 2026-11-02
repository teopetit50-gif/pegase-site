# TIROMA (cabinets dentaires) — dans le cloud

- Branche : `claude/copie-tiroma`, tirée de `origin/refonte-metiers/aiguillage`.
- Code : `app/espace2/tiroma/*`, `components/espace2/tiroma/*` (préfixe `tir-`). Inventaire : `docs/refonte-metiers/tiroma.md`. Découpage : `DECOUPAGES.md` § TIROMA.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Aujourd'hui | `/espace2/tiroma` | Linear, My issues | `linear-my-issues.md` |
| Créneaux et appels | `/espace2/tiroma/creneaux` | Plain, Threads (liste et fil ouvert) | `plain-threads.md` |
| Fauteuils | `/espace2/tiroma/fauteuils` | Cal.com, Bookings | `calcom-bookings.md` |
| Plans et devis | `/espace2/tiroma/plans` | Linear, Board | `linear-board.md` |
| Pilotage | `/espace2/tiroma/pilotage` | Plain, Insights | `plain-insights.md` |
| Réglages | `/espace2/tiroma/reglages` | Linear, Settings › Team | `linear-team-settings.md` |

## À savoir
- Promesse du site : « Votre cabinet tient sur une seule page » (`EnDirect.tsx:17`) : Aujourd'hui reste LA page du jour, complète ; les sous-pages reprennent les onglets du site (Point du matin, Créneaux, Fauteuils, Plans).
- Fauteuils : les deux notions « charge » et « demi-journées vides » enfin séparées (§ 17-21 de l'inventaire).
