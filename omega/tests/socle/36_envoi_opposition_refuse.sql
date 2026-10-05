-- 36 — un envoi vers une personne en opposition est refusé
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_36_envoi_opposition_refuse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_oppos text; t_envois text; col_oppos text; col_envoi text; col_canal_o text; col_canal_e text; col_statut text; valeurs jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  t_oppos := tests.table_parmi(array['oppositions']);
  t_envois := tests.table_parmi(array['envois']);
  if t_oppos is null or t_envois is null then return next fail('Tables oppositions/envois introuvables'); return; end if;
  col_oppos := tests.colonne_parmi(('public.' || t_oppos)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_envoi := tests.colonne_parmi(('public.' || t_envois)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible', 'a']);
  col_canal_o := tests.colonne_parmi(('public.' || t_oppos)::regclass, array['canal']);
  col_canal_e := tests.colonne_parmi(('public.' || t_envois)::regclass, array['canal']);
  if col_oppos is null or col_envoi is null then
    return next fail(format('Colonne du destinataire introuvable (oppositions : %s ; envois : %s) — adapter la liste de candidates', col_oppos, col_envoi));
    return next diag('Colonnes de ' || t_envois || ' : ' || (select string_agg(attname, ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_envois)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_oppos, 'oppose-a5@essai.invalid');
  if col_canal_o is not null then valeurs := valeurs || jsonb_build_object(col_canal_o, 'courriel'); end if;
  perform tests.inserer_minimal('public', t_oppos, valeurs);
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_envoi, 'oppose-a5@essai.invalid');
  if col_canal_e is not null then valeurs := valeurs || jsonb_build_object(col_canal_e, 'courriel'); end if;
  begin
    ligne := tests.inserer_minimal('public', t_envois, valeurs);
  exception when others then
    return next pass('L''envoi vers une personne en opposition est rejeté à l''insertion : ' || sqlerrm);
    return;
  end;
  col_statut := tests.colonne_parmi(('public.' || t_envois)::regclass, array['statut', 'etat', 'decision', 'verdict']);
  return next ok(col_statut is not null and (ligne ->> col_statut) ~* '(refus|bloqu|oppos|interdit)', format('Envoi accepté en base mais marqué %s = %L (attendu : refusé)', col_statut, ligne ->> col_statut));
  return next diag('Ligne d''envoi : ' || left(ligne::text, 500));
end $f$;

select * from runtests('tests'::name, '^test_36_');
