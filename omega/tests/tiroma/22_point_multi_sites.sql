-- B3-22 — Le point du matin multi-sites (b3_21), prouvé sur deux centres : le centre du banc (A) et un second centre,
-- « Centre B3-22 Les Abymes » (B), créé ici comme site rattaché à A. Le gérant est titulaire des deux ; l'assistante
-- et le collaborateur ne sont que dans A ; daf2, admin le temps du test, est la direction posée sur A.
-- Après 00, 00b, b3_01 à b3_21. runtests() annule tout.

create or replace function tests.test_b3_22_point_multi_sites() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  v_fuseau text;
  v_territoire text;
  v_nom_a text;
  v_nom_b text := 'Centre B3-22 Les Abymes';
  v_b uuid;
  j date;
  n integer;
  n1 bigint;
  n2 bigint;
  v_nus text[] := array['Créneaux à sauver', 'Plans sans rendez-vous', 'Avant les rendez-vous', 'Charge des fauteuils'];
begin
  r := tests.b3_cabinet_releve('initial');
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();
  perform tests.redevenir_admin();
  select en.fuseau, en.nom into v_fuseau, v_nom_a from public.entites en where en.id = entite;
  v_territoire := private.territoire_de_entite(banc, entite);
  j := (now() at time zone v_fuseau)::date;

  -- Le second centre : un site rattaché à A (même territoire, même fuseau), son cabinet, un fauteuil ouvert aujourd'hui.
  insert into public.entites (client_id, parent_id, nom, type, fuseau) values (banc, entite, v_nom_b, 'site', v_fuseau) returning id into v_b;
  perform tests.b3_endosser('gerant');
  perform public.tiroma_installer_cabinet(banc, v_b, 'logosw', 'cabinet', null);
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('gerant'), v_b, 'titulaire');
  insert into public.tiroma_fauteuils (client_id, entite_id, nom, capacites) values (banc, v_b, 'Fauteuil A', array['soins']);
  insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values
    (banc, v_b, extract(isodow from j)::smallint, '08:00', '12:00'), (banc, v_b, extract(isodow from j)::smallint, '14:00', '19:00');
  perform tests.redevenir_admin();
  update public.tiroma_cabinets set statut = 'actif' where client_id = banc and entite_id = v_b;
  -- La direction, posée sur A : elle suit A et le site qui en dépend.
  update public.comptes set role = 'admin' where client_id = banc and user_id = tests.b3_compte('daf2');
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('daf2'), entite, 'direction');

  -- Le dépôt de 7 h.
  n := private.tiroma_deposer_points((j + time '07:00') at time zone v_fuseau);
  return next is(n, 4, 'quatre services : titulaire, collaborateur et assistante dans A, titulaire dans B');

  -- Le titulaire des deux centres : chaque titre dit son centre.
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                          and s.destinataire = tests.b3_compte('gerant') and s.entite_id = entite and s.titre like '% — ' || left(v_nom_a, 60)),
                 format('titulaire : ses sections de A finissent par « — %s »', left(v_nom_a, 60)));
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                              and s.destinataire = tests.b3_compte('gerant') and s.titre = any (v_nus)),
                 'titulaire : aucun titre nu, qu''on ne saurait rattacher à un centre');
  if public.jour_ferie(j, v_territoire) then
    return next skip('aujourd''hui est férié : le Fauteuil A de B est fermé, pas de charge à déposer');
  else
    return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                            and s.destinataire = tests.b3_compte('gerant') and s.entite_id = v_b and s.titre = 'Charge des fauteuils — ' || v_nom_b),
                   format('titulaire : « Charge des fauteuils — %s » (le fauteuil vide de B)', v_nom_b));
  end if;

  -- Un membre d'un seul centre garde les titres de toujours.
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                          and s.destinataire = tests.b3_compte('referent') and s.entite_id = entite and s.titre = any (v_nus)),
                 'assistante de A seulement : titres inchangés');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                              and s.destinataire in (tests.b3_compte('referent'), tests.b3_compte('daf')) and s.entite_id = v_b),
                 'ni l''assistante ni le collaborateur de A ne reçoivent B');

  -- La direction : les compteurs de chaque centre.
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                          and s.destinataire = tests.b3_compte('daf2') and s.entite_id = entite and s.titre = 'Cabinet dentaire — ' || left(v_nom_a, 90) and not s.sante),
                 'direction : les compteurs de A, sans santé');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                          and s.destinataire = tests.b3_compte('daf2') and s.entite_id = v_b and s.titre = 'Cabinet dentaire — ' || v_nom_b and not s.sante),
                 'direction de A : les compteurs du site B qui en dépend');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                              and s.destinataire = tests.b3_compte('daf2') and s.sante),
                 'direction : aucune section de santé');

  -- Rejouer le dépôt ne double rien.
  select count(*) into n1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j;
  perform private.tiroma_deposer_points((j + time '07:30') at time zone v_fuseau);
  select count(*) into n2 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j;
  return next is(n2, n1, format('rejoué à 7 h 30 : toujours %s sections', n1));

  -- B coupé : le titulaire n'a plus qu'un centre actif, ses titres de A redeviennent nus et les anciens partent.
  update public.tiroma_cabinets set statut = 'coupe' where client_id = banc and entite_id = v_b;
  perform private.tiroma_deposer_points((j + time '08:00') at time zone v_fuseau);
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                          and s.destinataire = tests.b3_compte('gerant') and s.entite_id = entite and s.titre = any (v_nus)),
                 'B coupé : les sections de A du titulaire reprennent leur titre nu');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j
                              and s.destinataire = tests.b3_compte('gerant') and s.entite_id = entite and s.titre like '% — ' || left(v_nom_a, 60)),
                 'et les titres suffixés de A sont retirés');
end $f$;

select * from runtests('tests'::name, '^test_b3_22_');
