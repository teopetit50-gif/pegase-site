# DALIRO (BTP) — reprise dans le cloud

- Branche : reprendre `claude/copie-daliro-056765` (déjà poussée, commit 8f5d0daa au passage au cloud).
  Mise en place : `git fetch origin claude/copie-daliro-056765` puis
  `git checkout -b claude/copie-daliro-056765 origin/claude/copie-daliro-056765`.
- Code : `app/espace2/daliro/*`, `components/espace2/daliro/*` (préfixe `dal-`). Inventaire : `docs/refonte-metiers/daliro.md`.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Vue d'ensemble | `/espace2/daliro` | Linear, accueil d'une équipe | `linear-home.md` |
| Chantiers | `/espace2/daliro/chantiers` | Linear, Projects en Timeline | `linear-projects.md` + `linear-timeline.md` |
| Fiche d'un chantier | `/espace2/daliro/chantiers/[id]` | Linear, page d'une Initiative | `linear-initiative.md` |
| À ranger | `/espace2/daliro/a-ranger` | Linear, Triage | `linear-triage.md` |
| À faire | `/espace2/daliro/a-faire` | Linear, My issues | `linear-my-issues.md` |
| Avenants et situations | `/espace2/daliro/avenants` | Linear, Board | `linear-board.md` |
| Équipes | `/espace2/daliro/equipes` | Cal.com, Availability | `calcom-availability.md` |
| Annuaire | `/espace2/daliro/annuaire` | Attio, People et fiche d'un contact | `attio-people.md` |
| Réglages | `/espace2/daliro/reglages` | Linear, Settings › Labels et Templates | `linear-labels-templates.md` |

## Où en était la session locale (02/11)
- Fait : socle `dal-` (jetons Linear exacts, carte, menu, icônes, `outils/dal-superpose.py`).
- Vue d'ensemble : superposée, le corps tombe juste avec `--dx -29` ; dernières corrections poussées mais pas re-capturées → re-capturer et superposer.
- Chantiers en Timeline : poussé, pas vérifié → superposer.
- Fiche d'un chantier : seul l'en-tête Initiative est fait ; reste le corps (mesurer) et la variable `statut` inutilisée (avertissement eslint).
- Reste : À ranger, À faire, Avenants, Équipes, Réglages, puis Annuaire en dernier (relevé Attio refait), `REFERENCES-DALIRO.md`, tsc, aiguillage, build.
- Le planning façon Float d'avant disparaît au profit de la référence ; ses gestes (glisser, étirer, poser des heures, absences) restent.
