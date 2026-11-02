# LORANI (architectes) — reprise dans le cloud

- Branche : reprendre `claude/copie-lorani-e1a930` (déjà poussée, commit 8c0715ef au passage au cloud).
  Mise en place : `git fetch origin claude/copie-lorani-e1a930` puis
  `git checkout -b claude/copie-lorani-e1a930 origin/claude/copie-lorani-e1a930`.
- Code : `app/espace2/lorani/*`, `components/espace2/lorani/*` (préfixe `lor-`). Inventaire : `docs/refonte-metiers/lorani.md`.
- Les anciens liens `/espace2/lorani?permis=<id>` et `?projet=<id>` (courriels déjà partis) mènent toujours à la bonne page.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Vue d'ensemble | `/espace2/lorani` | Linear, Projects (liste) | `linear-projects.md` |
| Permis | `/espace2/lorani/permis/[id]` | Linear, page d'un ticket | `linear-ticket.md` |
| Projet | `/espace2/lorani/projets/[id]` | Linear, page d'une Initiative | `linear-initiative.md` |
| Courrier à ranger | `/espace2/lorani/courrier` | Linear, Inbox | `linear-inbox.md` |
| Honoraires et temps | `/espace2/lorani/honoraires` | Attio, People et fiche d'un contact | `attio-people.md` |
| Réglages | `/espace2/lorani/reglages` | Linear, Settings › Team | `linear-team-settings.md` |

## Où en était la session locale (02/11)
- Vue d'ensemble : liste « All projects » de Linear au 1:1, premier jet puis corrections (nom court, santé sans suffixe) ; `REFERENCES-LORANI.md` créé avec la méthode. Vérifier par superposition.
- Reste : Permis, Projet, Courrier, Réglages, puis Honoraires et temps en dernier (relevé Attio refait), tsc, aiguillage, build.
- Lis `git log` et `REFERENCES-LORANI.md` de la branche pour le détail.
