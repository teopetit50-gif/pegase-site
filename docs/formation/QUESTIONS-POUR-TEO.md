# Formation : les questions qui attendent Teo

Tenu par la session « refonte de la Formation ». On retire une question dès que Teo y a répondu, et on reporte sa réponse dans `CAHIER-DES-CHARGES.md`.

## 1. Importer le catalogue dans /omega → Formation ?

Le tableau « Formation » de `/omega`, où vous collerez les liens de vos vidéos, est enregistré en base (`omega_lignes`). Les sessions n'y écrivent pas sans votre accord. L'import est prêt dans `docs/formation/import-omega-lignes.sql` : une ligne par vidéo du catalogue, avec le module, le titre, le statut, l'objectif et le script. Une vidéo déjà présente n'est jamais recréée.

- **Importer (recommandé)** : les 56 vidéos et leurs scripts apparaissent dans `/omega` → Formation. Vous n'avez plus qu'à coller un lien sur la bonne ligne.
- **Ne pas importer** : vous créez vous-même les lignes au fil des tournages, avec l'identifiant de chaque vidéo (voir `SCRIPTS.md`).

## 2. Le visuel de la Formation

Il y a 2 ou 3 directions à choisir, préparées sur la branche `claude/formation-visuel` (sans mise en ligne). Elles vous seront montrées en captures à votre retour.
