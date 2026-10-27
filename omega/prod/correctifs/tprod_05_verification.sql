-- tprod_05_verification — à jouer sur la PRODUCTION (omega-core-eu), en lecture seule, AVANT et APRÈS
-- tprod_05_portes_anon.sql. La production n'a pas de schéma tests : cette requête remplace le test pgTAP.
--
-- Attendu après la pose :
--   · exactement 4 lignes : agenda_public, btp_lire_a_signer, btp_signer_sur_place, demande_pour_confirmation ;
--   · par_public = false sur chacune ; anon, authenticated, service_role = true ;
--   · hors_liste = false partout (sinon : une autre fonction SECURITY DEFINER est ouverte à anon, à traiter).

select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as fonction,
       exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')
         or p.proacl is null as par_public,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute') as service_role,
       not (n.nspname = 'public'
            and p.proname in ('agenda_public', 'demande_pour_confirmation', 'btp_lire_a_signer', 'btp_signer_sur_place')) as hors_liste
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and has_function_privilege('anon', p.oid, 'execute')
  and n.nspname not in ('pg_catalog', 'information_schema', 'extensions', 'graphql', 'graphql_public', 'pgbouncer',
                        'realtime', 'storage', 'vault', 'net', 'cron', 'supabase_functions', 'auth', 'pgsodium')
order by 1;
