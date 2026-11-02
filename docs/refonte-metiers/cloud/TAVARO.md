# TAVARO (location de véhicules) — dans le cloud

- Branche : `claude/copie-tavaro`, tirée de `origin/refonte-metiers/aiguillage`.
- Code : `app/espace2/tavaro/*`, `components/espace2/tavaro/*` (préfixe `tav-`). Inventaire : `docs/refonte-metiers/tavaro.md`. Découpage : `DECOUPAGES.md` § TAVARO.

| Sous-page | Route | Référence | Relevé |
|---|---|---|---|
| Vue d'ensemble | `/espace2/tavaro` | Linear, accueil d'une équipe | `linear-home.md` |
| Retours à facturer | `/espace2/tavaro/retours` | Linear, Inbox | `linear-inbox.md` |
| Contrat | `/espace2/tavaro/contrats/[id]` | Linear, page d'un ticket | `linear-ticket.md` |
| Parc et atelier | `/espace2/tavaro/parc` | Linear, Board | `linear-board.md` |
| Amendes, péages, contestations | `/espace2/tavaro/amendes` | Linear, Triage | `linear-triage.md` |
| Incidents | `/espace2/tavaro/incidents` | Plain, Tasks | `plain-tasks.md` |
| Réseau et flotte | `/espace2/tavaro/reseau` | Linear, liste des Initiatives | `linear-initiatives-liste.md` |
| Réglages | `/espace2/tavaro/reglages` | Linear, Settings › Labels et Templates | `linear-labels-templates.md` |

## À savoir
- Le filtre d'agence s'applique à toute la page (§ 8.3-5 de l'inventaire).
- Doublons à trancher (§ 8.3-3) : cote de revente, vendre / renouveler, caution — une seule entrée, le geste gardé.
- Repères à ajouter dans `aiguillage.ts` (liste dans `DECOUPAGES.md` § TAVARO), dont `/tavaro/factures` → Retours à facturer.
- Une ébauche locale abandonnée existe peut-être sur `origin/claude/metiers-tavaro-31fea4` : ne pas s'en servir pour le dessin.
