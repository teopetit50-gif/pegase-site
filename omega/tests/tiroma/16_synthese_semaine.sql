-- B3-16 — La synthèse de la semaine pour la direction (b3_15) : qui la lit, ce qu'elle compte, et son dépôt au point du
-- matin du lundi (sans nom). Après 00, 00b, b3_01 à b3_15. runtests() annule tout.

create or replace function tests.test_b3_16_synthese_semaine() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  s jsonb;
  c jsonb;
  j date;
  v_lundi date;
  v_fuseau text;
  v_passes integer;
  v_manques integer;
  n integer;
begin
  r := tests.b3_cabinet_releve('initial');
  -- Le relevé du lendemain : R005 (J-2) devient manqué.
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();
  select e.fuseau into v_fuseau from public.entites e where e.id = entite;
  j := (now() at time zone v_fuseau)::date;
  v_lundi := date_trunc('week', j - 2)::date;   -- la semaine qui contient R005

  -- Qui lit.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_synthese_semaine(%L)', banc), '42501', null, 'l''assistante ne lit pas la synthèse (42501)');
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_synthese_semaine(%L, %L)', banc, entite), '42501', null, 'le collaborateur non plus (42501)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_synthese_semaine(%L)', banc), '42501', null, 'ni daf2 sans profil (42501)');

  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_synthese_semaine(%L, null, %L::date)', banc, v_lundi + 1), '22023', null, 'une semaine commence un lundi (22023)');
  s := public.tiroma_synthese_semaine(banc, null, v_lundi);
  return next is(jsonb_array_length(s -> 'cabinets'), 1, 'le titulaire voit son cabinet');
  c := s -> 'cabinets' -> 0;
  return next is((c ->> 'entite_id')::uuid, entite, 'c''est Novasud Antilles');
  return next is(s #>> '{semaine,du}', v_lundi::text, 'la semaine demandée, du lundi…');
  return next is(s #>> '{semaine,au}', (v_lundi + 6)::text, '…au dimanche');

  -- Ce qu'elle compte, comparé à la base.
  select count(*) filter (where statut not in ('annule', 'reporte', 'supprime')), count(*) filter (where statut = 'manque')
    into v_passes, v_manques
  from public.tiroma_rendez_vous
  where entite_id = entite and debut >= v_lundi::timestamp at time zone v_fuseau and debut < (v_lundi + 7)::timestamp at time zone v_fuseau and debut < now();
  return next is((c #>> '{rdv,passes}')::integer, v_passes, format('%s rendez-vous passés dans la semaine', v_passes));
  return next ok((c #>> '{rdv,manques}')::integer = v_manques and v_manques >= 1, format('%s manqué(s), dont R005', v_manques));
  return next is((c #>> '{rdv,taux_manques}')::numeric, round(v_manques::numeric / nullif(v_passes, 0), 3), 'le taux de manqués');
  return next is((s #>> '{total,manques}')::integer, v_manques, 'le total reprend le cabinet');
  return next is((c #>> '{plans_sans_rdv,nombre}')::integer, jsonb_array_length(public.tiroma_plans_sans_rendez_vous(banc, entite)),
                 'les plans sans rendez-vous : le même compte que la carte');
  return next ok(c ? 'precedent' and c #> '{precedent}' ? 'taux_manques', 'la semaine d''avant est donnée');
  return next ok(c::text !~ '(Dorville|Delannoy|Bazile|Patient-essai)', 'aucun nom de patient dans la synthèse');

  -- La direction : un profil direction sur l'entité, sans profil de cabinet.
  perform tests.redevenir_admin();
  -- Une direction est gérante ou administratrice (tiroma_profil_coherent) : daf2, valideur sur le banc, devient admin le temps du test.
  update public.comptes set role = 'admin' where client_id = banc and user_id = tests.b3_compte('daf2');
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('daf2'), entite, 'direction');
  perform tests.b3_endosser('daf2');
  s := public.tiroma_synthese_semaine(banc, null, v_lundi);
  return next is(jsonb_array_length(s -> 'cabinets'), 1, 'la direction lit la synthèse de ses centres');
  return next is((s #>> '{total,manques}')::integer, v_manques, 'avec les mêmes chiffres');

  -- Le lundi à 7 h, la section au point du matin du titulaire et de la direction, sans santé.
  perform tests.redevenir_admin();
  n := private.tiroma_deposer_synthese((date_trunc('week', j)::date + 7 + time '07:00') at time zone v_fuseau);
  return next ok(n >= 2, format('le lundi, la synthèse est déposée (%s destinataires)', n));
  return next ok(exists (select 1 from public.points_sections x where x.client_id = banc and x.module = 'tiroma'
                          and x.jour = date_trunc('week', j)::date + 7 and x.destinataire = tests.b3_compte('gerant')
                          and x.titre like 'Synthèse de la semaine%'), 'au titulaire');
  return next ok(exists (select 1 from public.points_sections x where x.client_id = banc and x.module = 'tiroma'
                          and x.jour = date_trunc('week', j)::date + 7 and x.destinataire = tests.b3_compte('daf2')
                          and x.titre like 'Synthèse de la semaine%'), 'et à la direction');
  return next ok(not exists (select 1 from public.points_sections x where x.client_id = banc and x.module = 'tiroma'
                              and x.destinataire = tests.b3_compte('referent') and x.titre like 'Synthèse de la semaine%'), 'pas à l''assistante');
  n := private.tiroma_deposer_synthese((date_trunc('week', j)::date + 8 + time '07:00') at time zone v_fuseau);
  return next is(n, 0, 'le mardi, rien à déposer');
end $f$;

select * from runtests('tests'::name, '^test_b3_16_');
