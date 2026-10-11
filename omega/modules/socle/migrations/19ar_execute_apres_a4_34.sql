-- 19ar_execute_apres_a4_34 — socle : EXECUTE sur private.filed_rapprocher_ligne remis à la règle d'a5_01.
-- A5, 11/10/2026, test 44 rejoué par le coordinateur (lot h1404tout) : « Manquantes (à accorder) : filed_rapprocher_ligne ».
-- a4_34 (FILED, relevés bancaires) crée la porte public.filed_rapprocher_ligne en SQL SECURITY INVOKER, qui appelle
-- private.filed_rapprocher_ligne : authenticated doit pouvoir l'exécuter (règle (b) d'a5_01). Ce lot l'accorde, sur toutes
-- les signatures présentes, et le vérifie. Rejouer a5_01_private_execute.sql produit le même état.
-- Rien n'est supprimé. Rejouable.

do $lot$
declare
  f regprocedure;
  n integer := 0;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'private' and p.proname = 'filed_rapprocher_ligne'
  loop
    execute format('grant execute on function %s to authenticated, service_role', f);
    n := n + 1;
    raise notice 'Lot 19ar : EXECUTE à authenticated sur %', f;
  end loop;
  if n = 0 then
    raise exception 'Lot 19ar : private.filed_rapprocher_ligne introuvable (a4_34 posé ?) ; rien n''est changé.';
  end if;
end $lot$;

do $controle$
declare
  v text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into v
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'private' and p.proname = 'filed_rapprocher_ligne'
    and (not has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'));
  if v is not null then
    raise exception 'Lot 19ar : droits inattendus sur %', v;
  end if;
end $controle$;
