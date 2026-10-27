-- tprod_05 — TPROD-05 : anon n'exécute que les portes publiques voulues (quatre, et btp_signer_un_geste depuis b6_51), et elles marchent encore.
-- Exécutable tel quel par execute_sql sur la RECETTE, après omega/prod/correctifs/tprod_05_portes_anon.sql.
-- runtests() annule tout. Le parcours complet de signature par anon est dans daliro/b6_14.

create or replace function tests.test_tprod_05_portes_anon() returns setof text
language plpgsql as $f$
declare
  -- 27/10/2026 : btp_signer_un_geste (Daliro b6_51, signature par lien en un geste, posée sur la recette après TPROD-05)
  -- est une porte voulue pour anon, gardée par son jeton comme btp_signer_sur_place.
  v_admises text[] := array['agenda_public', 'demande_pour_confirmation', 'btp_lire_a_signer', 'btp_signer_sur_place',
                            'btp_signer_un_geste'];
  v_autres text[];
  v_etat text;
  v_role text;
begin
  -- ── 1. Aucune autre fonction SECURITY DEFINER n'est ouverte à anon ──
  select coalesce(array_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text), '{}') into v_autres
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and has_function_privilege('anon', p.oid, 'execute')
    and n.nspname not in ('pg_catalog', 'information_schema', 'extensions', 'graphql', 'graphql_public', 'pgbouncer',
                          'realtime', 'storage', 'vault', 'net', 'cron', 'supabase_functions', 'auth', 'pgsodium', 'tests')
    and not (n.nspname = 'public' and p.proname = any (v_admises));
  return next is(v_autres, '{}'::text[], 'anon n''exécute aucune fonction SECURITY DEFINER hors des portes publiques');

  -- ── 2. Les portes présentes : nommées, jamais par PUBLIC ──
  return next is((select count(*)::int
                  from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(p.proacl) a
                  where n.nspname = 'public' and p.proname = any (v_admises)
                    and a.grantee = 0 and a.privilege_type = 'EXECUTE'), 0,
                 'Aucune des portes publiques n''est exécutable par PUBLIC');
  return next ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                             where n.nspname = 'public' and p.proname = any (v_admises)
                               and not (has_function_privilege('anon', p.oid, 'execute')
                                        and has_function_privilege('authenticated', p.oid, 'execute')
                                        and has_function_privilege('service_role', p.oid, 'execute'))),
                 'anon, authenticated et service_role exécutent chaque porte présente');

  -- ── 3. Le parcours légitime : anon entre dans la fonction (P0002, pas 42501) ──
  if to_regprocedure('public.btp_lire_a_signer(text)') is null then
    return next ok(true, 'Signature sur place absente de cet environnement : sans objet');
    return;
  end if;
  v_role := current_user;
  begin
    set local role anon;
    perform public.btp_lire_a_signer(repeat('0', 64));
    reset role;
    v_etat := 'aucune';
  exception when others then v_etat := sqlstate;
  end;
  if current_user <> v_role then reset role; end if;
  return next is(v_etat, 'P0002', 'anon lit par le jeton : un jeton inconnu répond « lien plus valable », pas « permission refusée »');

  begin
    set local role anon;
    perform public.btp_signer_sur_place(repeat('0', 64), 'Paul Essai', null, 'data:image/png;base64,abc', true, null);
    reset role;
    v_etat := 'aucune';
  exception when others then v_etat := sqlstate;
  end;
  if current_user <> v_role then reset role; end if;
  return next is(v_etat, 'P0002', 'anon signe par le jeton : un jeton inconnu répond « lien plus valable », pas « permission refusée »');

  begin
    set local role anon;
    perform public.btp_preparer_signature(gen_random_uuid(), 7);
    reset role;
    v_etat := 'aucune';
  exception when others then v_etat := sqlstate;
  end;
  if current_user <> v_role then reset role; end if;
  return next is(v_etat, '42501', 'anon ne prépare toujours pas de lien (porte fermée à côté)');
end $f$;
