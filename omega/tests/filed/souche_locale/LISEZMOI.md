# Souche locale du socle (A4)

Une photographie minimale du socle Omega, suffisante pour appliquer les migrations `a4_*` et
jouer les tests `a4_*` sur un PostgreSQL 16 local, sans toucher à la recette. Les corps des
fonctions de validation et de FILED sont ceux de `omega/SOCLE-EXTRAITS-FILED.sql` ; le reste
(périmètres, journal, alertes, mesures, travaux) est une souche qui imite le comportement.

```
initdb -D /tmp/pg/data -U postgres --auth=trust ; pg_ctl -D /tmp/pg/data start
createdb -U postgres omega ; psql -U postgres -d omega -c "create extension pgcrypto schema public"
psql -U postgres -d omega -f 01_tables.sql ; psql -U postgres -d omega -f 02_fonctions.sql
psql -U postgres -d omega -c "grant insert on public.approbations to authenticated; grant insert, update on public.demandes_validation to authenticated;
  create or replace function public.filed_installer(p_client uuid) returns uuid language sql set search_path to '' as \$\$ select private.filed_installer(p_client) \$\$;"
for f in ../../../migrations/a4_0*.sql; do psql -U postgres -d omega -v ON_ERROR_STOP=1 -f $f; done
psql -U postgres -d omega -c "alter table public.filed_factures drop constraint filed_factures_statut_check"   # ce que le coordinateur fait à la main sur la recette
for t in ../a4_0*.sql; do psql -U postgres -d omega -v ON_ERROR_STOP=1 -f $t; done
```

Ne jamais exécuter cette souche sur la recette ni sur la production.
