-- 37 — un envoi non transactionnel hors heures légales est différé, pas parti
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_37_envoi_hors_heures_differe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_envois text; col_dest text; col_quand text; col_nature text; col_statut text; col_differe text; valeurs jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  t_envois := tests.table_parmi(array['envois']);
  if t_envois is null then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi(('public.' || t_envois)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible', 'a']);
  col_quand := tests.colonne_parmi(('public.' || t_envois)::regclass, array['prevu_le', 'programme_le', 'envoyer_le', 'souhaite_le', 'demande_le', 'a_partir_de']);
  col_nature := tests.colonne_parmi(('public.' || t_envois)::regclass, array['nature', 'type_envoi', 'categorie', 'transactionnel']);
  col_statut := tests.colonne_parmi(('public.' || t_envois)::regclass, array['statut', 'etat']);
  if col_dest is null then
    return next fail('Colonne du destinataire introuvable dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_envois)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- Un dimanche à 23 h : hors plage quel que soit le canal
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, '+33600000000', 'canal', 'sms');
  if col_quand is not null then valeurs := valeurs || jsonb_build_object(col_quand, '2026-10-11T23:00:00+02:00'); end if;
  if col_nature is not null then valeurs := valeurs || jsonb_build_object(col_nature, case when col_nature = 'transactionnel' then 'false' else 'prospection' end); end if;
  begin
    ligne := tests.inserer_minimal('public', t_envois, valeurs);
  exception when others then
    return next fail('L''envoi hors heures est rejeté au lieu d''être différé : ' || sqlerrm);
    return;
  end;
  col_differe := tests.colonne_parmi(('public.' || t_envois)::regclass, array['differe_a', 'reporte_a', 'envoi_prevu_le', 'prochaine_fenetre', 'prevu_le', 'programme_le']);
  return next ok((col_statut is not null and (ligne ->> col_statut) ~* '(differ|report|attente|planifi|programm)')
              or (col_differe is not null and col_quand is not null and col_differe <> col_quand and (ligne ->> col_differe) is not null
                  and (ligne ->> col_differe)::timestamptz > '2026-10-11T23:00:00+02:00'::timestamptz),
    format('L''envoi est différé (%s = %L ; %s = %L)', col_statut, ligne ->> col_statut, col_differe, ligne ->> col_differe));
  return next diag('Ligne d''envoi : ' || left(ligne::text, 500));
end $f$;

select * from runtests('tests'::name, '^test_37_');
