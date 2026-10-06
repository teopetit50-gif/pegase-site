-- 19ag_execute_apres_a4_14_b4_05 — socle : EXECUTE sur private remis à la règle d'a5_01 après deux lots de modules.
-- A5, 06/10/2026, à la demande du coordinateur. Constat : test 44 rejoué après 19af (2/5 rouges).
--
-- (a) Manquantes pour authenticated — filed_iban_valide, filed_luhn, filed_siren_valide, filed_tva_intracom_analyser.
--     Cause : a4_14 (FILED lot 7, worker-a4 cf4c3af, posé le 06/10 à 02:35:55 Z, après a5_01_v2 à 01:18:40 Z) a créé le
--     déclencheur pieces_valeurs_cle_humaine sur public.pieces_valeurs. Sa fonction private.filed_valeur_humaine_cle()
--     est SECURITY INVOKER : elle appelle filed_siren_valide, filed_tva_intracom_analyser et filed_iban_valide ;
--     filed_tva_intracom_analyser (INVOKER) appelle filed_luhn. Sous RLS, toute écriture d'une valeur « humain » par
--     un membre exécute ces quatre fonctions avec ses droits. Elles n'avaient jamais eu EXECUTE pour authenticated :
--     le lot n'a rien retiré, il les a rendues nécessaires (règle (c) d'a5_01 : déclencheur INVOKER de private).
-- (b) En trop pour authenticated — tamila_coffre_serveur(), tamila_coffre_reference(text, text).
--     b4_05 (Tamila, coffre, 38b45a0) les accorde explicitement à authenticated (lignes 669-670), mais tous leurs appelants
--     sont SECURITY DEFINER (tamila_coffre_etat, _pour_membre, _activer, _conclure, _reenveloppe, et le déclencheur
--     tamila_cle_conforme) : ils s'exécutent avec les droits du propriétaire. Aucune politique, vue, CHECK, DEFAULT,
--     clause WHEN ni fonction INVOKER ne les appelle. Le droit est sans usage : retiré.
--
-- Rejouer a5_01_private_execute.sql produit le même état ; ce lot le fait de façon ciblée et le vérifie.
-- Rien n'est supprimé. Rejouable.

do $lot$
declare
  f regprocedure;
  n integer := 0;
begin
  -- (a) Toutes les signatures des quatre fonctions, quelle qu'en soit la liste d'arguments.
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'private'
      and p.proname in ('filed_iban_valide', 'filed_luhn', 'filed_siren_valide', 'filed_tva_intracom_analyser')
  loop
    execute format('grant execute on function %s to authenticated, service_role', f);
    n := n + 1;
    raise notice 'Lot 19ag : EXECUTE à authenticated sur %', f;
  end loop;
  if n < 4 then
    raise exception 'Lot 19ag : % fonction(s) FILED trouvée(s) sur 4 attendues ; rien n''est changé.', n;
  end if;
end $lot$;

-- (b) Les deux outils du coffre Tamila : appelés seulement par des fonctions SECURITY DEFINER.
revoke execute on function private.tamila_coffre_serveur() from public, anon, authenticated;
revoke execute on function private.tamila_coffre_reference(text, text) from public, anon, authenticated;
grant execute on function private.tamila_coffre_serveur() to service_role;
grant execute on function private.tamila_coffre_reference(text, text) to service_role;

-- Contrôle immédiat : le lot s'annule tout entier si l'état attendu n'est pas atteint.
do $controle$
declare
  v text;
begin
  select string_agg(p.oid::regprocedure::text, ', ') into v
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'private'
    and p.proname in ('filed_iban_valide', 'filed_luhn', 'filed_siren_valide', 'filed_tva_intracom_analyser')
    and not has_function_privilege('authenticated', p.oid, 'execute');
  if v is not null then
    raise exception 'Lot 19ag : authenticated n''exécute toujours pas %', v;
  end if;
  if has_function_privilege('authenticated', 'private.tamila_coffre_serveur()', 'execute')
     or has_function_privilege('authenticated', 'private.tamila_coffre_reference(text, text)', 'execute') then
    raise exception 'Lot 19ag : authenticated exécute encore un outil du coffre Tamila (droit hérité d''un autre rôle ?)';
  end if;
  if not has_function_privilege('service_role', 'private.tamila_coffre_serveur()', 'execute')
     or not has_function_privilege('service_role', 'private.tamila_coffre_reference(text, text)', 'execute') then
    raise exception 'Lot 19ag : service_role a perdu un outil du coffre Tamila';
  end if;
end $controle$;
