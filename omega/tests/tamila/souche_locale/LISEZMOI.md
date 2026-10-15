# Souche locale Tamila (B4) — EN COURS, ne s'exécute nulle part ailleurs qu'en local

But : jouer `omega/tests/tamila/*.sql` sur un PostgreSQL 16 local (installé dans le conteneur de
recette : /usr/lib/postgresql/16), sans toucher à la recette, comme A4 l'a fait pour FILED.

- `extraire.py` : convertit `omega/SOCLE-EXTRAITS-TAMILA.sql` (photographie) en DDL exécutable
  (`02_tamila.sql`, généré, non commité) : tables, FK, RLS, politiques, vue, fonctions, déclencheurs.
  Un « défaut » qui cite une autre colonne (tamila_appels.regime) est réécrit en colonne générée.
- `01_socle.sql` : le socle imité (rôles, auth.uid(), clients/entites/comptes, pièces, journal,
  alertes, travaux, lectures, moteur de validation d'A4, B5 minimal : territoires, regles_delais,
  delais, proroger/echeance_de/ajouter_mois, poser_delai…). Écrit, PAS ENCORE JOUÉ.
- Reste à faire : `03_pgtap.sql` (ok/is/isnt/throws_ok/lives_ok/runtests réduits, pgTAP n'étant pas
  installé localement), les lignes de `tamila_regles_procedure` et `regles_delais` (26 codes, voir
  la réponse 1 du coordinateur dans NOTES-B4), `jouer.sh` (initdb, 01, 02, aides A5, 03, puis chaque
  test entre begin/rollback). Priorité basse tant que le coordinateur joue les lots sur la recette.
