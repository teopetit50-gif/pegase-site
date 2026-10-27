-- SOCLE, lot 19bb — anon n'écrit dans aucune table ni vue de public, et ne lit que le catalogue du site (27/10/2026).
-- Copie du dépôt omega-metiers (socle/base/), où ce lot a été écrit et testé, 27/10/2026.
--
-- Pourquoi : sur la recette des modules, anon (la clé publique, sans compte) avait SELECT, DELETE et MAINTAIN sur
-- clients, audit_journal, catalogue_site, profils_metier, moteurs_reconnus et la vue lorani_echeances_permis : les
-- droits que Supabase donne par défaut à la création d'une table ou d'une vue, jamais retirés. La RLS filtrait les
-- lignes (aucune politique pour anon), mais un droit de suppression ouvert à qui n'a pas de compte n'a rien à faire là.
-- La production n'accorde à anon que SELECT sur catalogue_site (relevé du 27/10) : on aligne la recette sur elle.
--
-- Ce qui est posé :
--   · tous les droits de table d'anon sur public retirés (tables, vues, vues matérialisées), droits par colonne compris ;
--   · SELECT rendu à anon sur public.catalogue_site seulement (la page publique du site le lit) ;
--   · rien n'est retiré aux autres rôles ; aucune fonction touchée (les portes publiques d'anon sont des fonctions,
--     gardées par TPROD-05).
-- Rejouable. Aucun DROP. Le gardien : socle_19bb_anon_sans_ecriture (tests).

revoke all on all tables in schema public from anon;

do $$
declare r record;
begin
  -- droits par colonne d'anon (un revoke sur la table ne les retire pas tous)
  for r in select distinct c.oid::regclass::text t, a.attname
           from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace,
                aclexplode(a.attacl) x
           where n.nspname = 'public' and a.attacl is not null and x.grantee = 'anon'::regrole loop
    execute format('revoke all (%I) on %s from anon', r.attname, r.t);
  end loop;
end $$;

grant select on table public.catalogue_site to anon;

-- Contrôle : anon n'a plus que SELECT sur catalogue_site.
do $$
declare v_reste text;
begin
  select string_agg(c.relname || ':' || p, ', ' order by c.relname) into v_reste
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and has_table_privilege('anon', c.oid, p)
    and not (c.relname = 'catalogue_site' and p = 'SELECT');
  if v_reste is not null then
    raise exception 'socle 19bb : anon garde des droits : %', v_reste;
  end if;
end $$;
