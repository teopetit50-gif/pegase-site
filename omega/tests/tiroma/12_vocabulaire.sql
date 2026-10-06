-- B3-12 — Le vocabulaire : le titulaire classe et valide les types de rendez-vous (étape 8 du scénario) ;
-- l'assistante et le témoin ne touchent à rien ; pas de validation sans famille ; une classification humaine
-- tient, et le relevé suivant ne l'écrase pas.
-- Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 à b3_08. runtests() annule tout.

create or replace function tests.test_b3_12_vocabulaire() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  t_lv uuid;        -- « RDV LV », à classer
  t_controle uuid;  -- « Contrôle annuel », proposé par la règle
  t_urgence uuid;   -- « Urgence », proposé par la règle
  t_reunion uuid;   -- « Réunion d'équipe », proposé « personnel » par la règle
  v_bilan jsonb;
begin
  r := tests.b3_cabinet_releve('initial');
  select id into t_lv from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'RDV LV';
  select id into t_controle from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Contrôle annuel';
  select id into t_urgence from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Urgence';
  select id into t_reunion from public.tiroma_types_rdv where entite_id = entite and libelle_source = 'Réunion d''équipe';
  return next ok(t_lv is not null and t_controle is not null and t_urgence is not null and t_reunion is not null, 'les quatre types du récit existent');
  return next is((select statut || '/' || coalesce(classe_par, '-') from public.tiroma_types_rdv where id = t_controle), 'propose/regle', '« Contrôle annuel » est proposé par la règle');
  return next is((select statut || '/' || coalesce(famille, '-') from public.tiroma_types_rdv where id = t_lv), 'a_classer/-', '« RDV LV » est à classer, sans famille');
  return next is((select statut || '/' || famille || '/' || classe_par from public.tiroma_types_rdv where id = t_reunion), 'propose/personnel/regle', '« Réunion d''équipe » est proposé « personnel » par la règle');

  -- 8. Le titulaire classe « RDV LV » (un rendez-vous personnel du praticien) et le valide.
  perform tests.b3_endosser('gerant');
  -- Pas de validation sans famille.
  return next throws_ok(format('update public.tiroma_types_rdv set statut = ''valide'' where id = %L', t_lv), '23514', null,
                        'valider « RDV LV » sans lui donner de famille est refusé (23514)');
  update public.tiroma_types_rdv set famille = 'personnel', statut = 'valide', necessite_labo = false, chirurgie = false, exige_assistante = false where id = t_lv;
  return next is((select statut || '/' || famille || '/' || classe_par from public.tiroma_types_rdv where id = t_lv), 'valide/personnel/humain',
                 '« RDV LV » : validé, famille « personnel », classé par un humain');
  return next ok((select valide_par = tests.b3_compte('gerant') and valide_le is not null and confiance is null from public.tiroma_types_rdv where id = t_lv),
                 'signé par le titulaire, daté, sans score de confiance');
  -- Il valide « Contrôle annuel » tel que la règle l'a proposé : la règle reste l'auteur de la classification.
  update public.tiroma_types_rdv set statut = 'valide' where id = t_controle;
  return next is((select statut || '/' || classe_par from public.tiroma_types_rdv where id = t_controle), 'valide/regle', '« Contrôle annuel » validé tel quel : classé par la règle, validé par le titulaire');
  -- Le titulaire peut reclasser une proposition de la règle sans la valider.
  update public.tiroma_types_rdv set famille = 'autre', statut = 'propose' where id = t_reunion;
  return next is((select statut || '/' || famille || '/' || classe_par from public.tiroma_types_rdv where id = t_reunion), 'propose/autre/humain', '« Réunion d''équipe » : reclassé « autre » par le titulaire, pas encore validé');
  perform tests.redevenir_admin();

  -- L'assistante lit le vocabulaire, ne le classe pas (l'UPDATE sous RLS ne touche aucune ligne).
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_types_rdv', format('entite_id = %L', entite)), 9::bigint, 'l''assistante lit les 9 types');
  update public.tiroma_types_rdv set famille = 'chirurgie', statut = 'valide' where id = t_urgence;
  perform tests.redevenir_admin();
  return next is((select statut || '/' || famille from public.tiroma_types_rdv where id = t_urgence), 'propose/urgence', 'l''assistante n''a rien changé à « Urgence »');
  -- Le témoin sans profil ne voit rien et ne change rien.
  perform tests.b3_endosser('daf2');
  return next is(tests.compter('public', 'tiroma_types_rdv', format('entite_id = %L', entite)), 0::bigint, 'daf2 ne voit aucun type');
  update public.tiroma_types_rdv set statut = 'valide', famille = 'autre' where id = t_urgence;
  perform tests.redevenir_admin();
  return next is((select statut || '/' || famille from public.tiroma_types_rdv where id = t_urgence), 'propose/urgence', 'daf2 n''a rien changé non plus');

  -- Le relevé suivant redonne le même vocabulaire : la classification humaine tient.
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['types_rdv', 'agenda'], 'courant', 'b3:courant');
  v_bilan := tests.b3_traiter();
  return next ok((v_bilan ->> 'echecs')::integer = 0, format('relevé courant traité (%s fait(s), %s échec(s))', v_bilan ->> 'faits', v_bilan ->> 'echecs'));
  return next is((select statut || '/' || famille || '/' || classe_par from public.tiroma_types_rdv where id = t_lv), 'valide/personnel/humain', 'après le relevé, « RDV LV » reste validé « personnel »');
  return next is((select statut || '/' || famille from public.tiroma_types_rdv where id = t_reunion), 'propose/autre', 'et le reclassement du titulaire sur « Réunion d''équipe » tient');
  return next is(tests.compter('public', 'tiroma_types_rdv', format('entite_id = %L and statut = ''a_classer''', entite)), 0::bigint, 'plus aucun type à classer');
  -- Le journal garde la trace de la classification (déclencheur tracer, hors moteur).
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = banc and j.objet_type = 'tiroma_types_rdv' and j.objet_id = t_lv::text),
                 'journal : la classification de « RDV LV » est tracée');
end $f$;

select * from runtests('tests'::name, '^test_b3_12_');
