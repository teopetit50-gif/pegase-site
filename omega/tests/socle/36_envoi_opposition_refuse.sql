-- 36 — un envoi vers une personne en opposition est refusé par les verrous d'envoi
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.
-- Mécanique réelle (coordinateur, 5/10) : pas de déclencheur d'insertion ; private.opposer(...) pose l'opposition,
-- private.verrous_envoi(p_e envois, p_complet boolean, p_instant timestamptz) rend les verrous que lit tache_envois.

create or replace function tests.test_36_envoi_opposition_refuse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; type_oppos text; valeurs jsonb; ligne jsonb; verrous jsonb; sans_opposition jsonb;
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel']);
  if col_dest is null then
    return next fail('Colonne du destinataire introuvable dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, 'oppose-a5@essai.invalid');
  if col_canal is not null then valeurs := valeurs || jsonb_build_object(col_canal, 'courriel'); end if;
  if col_trans is not null then valeurs := valeurs || jsonb_build_object(col_trans, true); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  -- Verrous AVANT opposition : témoin
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id = $1' into sans_opposition using (ligne ->> 'id')::bigint;
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return next diag('Signatures : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname ~ 'verrou'), 'aucune'));
    return;
  end;
  -- Opposition par la porte du socle
  type_oppos := coalesce(nullif(regexp_replace(coalesce(tests.valeur_selon_check('public.oppositions'::regclass, 'type', 'text'::regtype), ''), '::.*$|''', '', 'g'), ''), 'prospect');
  begin
    perform tests.appeler_privee('opposer', jeu ->> 'client_a', type_oppos, 'oppose-a5@essai.invalid', 'courriel', null, null, 'essai A5', 'essai_a5', null);
  exception when others then
    return next fail('private.opposer(...) refuse l''appel d''essai : ' || sqlerrm);
    return next diag('Signature : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'opposer'), 'absente') || ' ; type essayé : ' || type_oppos);
    return;
  end;
  execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id = $1' into verrous using (ligne ->> 'id')::bigint;
  return next ok(verrous::text ~* 'oppos', 'Avec une opposition posée, verrous_envoi() nomme l''opposition');
  return next ok(sans_opposition::text !~* 'oppos', 'Sans opposition, verrous_envoi() ne la nommait pas (témoin)');
  return next diag('Verrous avec opposition : ' || left(verrous::text, 400));
  return next diag('Verrous sans opposition : ' || left(sans_opposition::text, 400));
end $f$;

select * from runtests('tests'::name, '^test_36_');
