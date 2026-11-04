-- 20261011135708 19aq_execute_apres_c4_10
-- Source : dépôt : 5e33f3b omega/modules/socle/migrations/19aq_execute_apres_c4_10.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : 19aq_execute_apres_c4_10.sql @ 5e33f3b.
-- ═══ omega/modules/socle/migrations/19aq_execute_apres_c4_10.sql @ 5e33f3b
-- 19aq_execute_apres_c4_10 — socle : EXECUTE sur private remis à la règle d'a5_01 après le lot c4_10 (OFFLOAD).
-- A5, 11/10/2026, à la demande du coordinateur.
--
-- c4_10 (worker-c4) crée six portes publiques en SQL SECURITY INVOKER — offload_ecrire_regle, offload_retirer_regle,
-- offload_suspendre, offload_reprendre, offload_lever_verification, offload_rattacher_groupe — qui appellent chacune
-- sa jumelle de private (SECURITY DEFINER). Une porte INVOKER s'exécute avec les droits de l'appelant : authenticated
-- doit donc pouvoir exécuter la jumelle (règle (b) d'a5_01). Or les fonctions de private naissent sans EXECUTE depuis
-- a5_01 (droits par défaut) : les portes répondraient 42501. Ce lot accorde l'EXECUTE aux six jumelles, et à rien d'autre.
-- Rejouer a5_01_private_execute.sql produit le même état ; ce lot le fait de façon ciblée et le vérifie.
-- Rien n'est supprimé. Rejouable.

do $lot$
declare
  f regprocedure;
  n integer := 0;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'private'
      and p.proname in ('offload_ecrire_regle', 'offload_retirer_regle', 'offload_suspendre', 'offload_reprendre',
                        'offload_lever_verification', 'offload_rattacher_groupe')
  loop
    execute format('grant execute on function %s to authenticated, service_role', f);
    n := n + 1;
    raise notice 'Lot 19aq : EXECUTE à authenticated sur %', f;
  end loop;
  if n < 6 then
    raise exception 'Lot 19aq : % fonction(s) OFFLOAD trouvée(s) sur 6 attendues (c4_10 posé ?) ; rien n''est changé.', n;
  end if;
end $lot$;

-- Contrôle immédiat : chaque porte publique et sa jumelle sont exécutables par authenticated, jamais par anon.
do $controle$
declare
  v text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into v
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'private'
    and p.proname in ('offload_ecrire_regle', 'offload_retirer_regle', 'offload_suspendre', 'offload_reprendre',
                      'offload_lever_verification', 'offload_rattacher_groupe')
    and (not has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'));
  if v is not null then
    raise exception 'Lot 19aq : droits inattendus sur %', v;
  end if;
end $controle$;
