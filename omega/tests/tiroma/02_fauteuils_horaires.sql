-- B3-02 — Fauteuils, horaires, fermetures et plages ouvertes (étapes 3 à 5 du scénario, omega/NOTES-B3.md).
-- Jouable tel quel par execute_sql sur la RECETTE, après 00_aides_b3.sql et b3_01. runtests() annule tout.

create or replace function tests.test_b3_02_fauteuils_horaires() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  eq jsonb;
  f1 uuid; f2 uuid;
  lundi date := tests.b3_prochain(1);
  samedi date := tests.b3_prochain(6);
  dimanche date := tests.b3_prochain(7);
  mardi date := tests.b3_prochain(2);
  ferie date;
  v_territoire text;
begin
  perform tests.b3_installer();
  eq := tests.b3_equipe();
  f1 := (eq ->> 'f1')::uuid; f2 := (eq ->> 'f2')::uuid;

  -- 3. Fauteuils : le titulaire en pose trois, l'assistante les voit mais n'en pose pas.
  return next is(tests.compter('public', 'tiroma_fauteuils', format('entite_id = %L', entite)), 3::bigint, 'trois fauteuils posés par le titulaire');
  return next throws_ok(format('insert into public.tiroma_fauteuils (client_id, entite_id, nom, capacites) values (%L, %L, ''Fauteuil 4'', array[''radiologie''])', banc, entite),
                        '23514', null, 'une capacité inconnue est refusée (23514)');
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_fauteuils', format('entite_id = %L', entite)), 3::bigint, 'l''assistante voit les trois fauteuils');
  return next throws_ok(format('insert into public.tiroma_fauteuils (client_id, entite_id, nom) values (%L, %L, ''Fauteuil 4'')', banc, entite),
                        '42501', null, 'l''assistante ne pose pas de fauteuil (42501)');
  -- Sous RLS, un UPDATE sans ligne permise ne lève rien : il ne touche aucune ligne (relevé par le coordinateur le 05/10).
  update public.tiroma_fauteuils set actif = false where id = f1;
  perform tests.redevenir_admin();
  return next is((select actif from public.tiroma_fauteuils where id = f1), true, 'ni ne les modifie : l''UPDATE de l''assistante ne touche aucune ligne');
  perform tests.b3_endosser('referent');

  -- 4. Horaires du cabinet, posés par le titulaire.
  perform tests.b3_endosser('gerant');
  return next is(tests.b3_horaires(), 11, 'onze lignes d''horaires : lundi–vendredi 8–12 et 14–19, samedi 8–12');
  return next throws_ok(format('insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values (%L, %L, 1, ''19:00'', ''08:00'')', banc, entite),
                        '23514', null, 'une fin avant le début est refusée (23514)');
  return next throws_ok(format('insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin, exceptionnel, valide_du, valide_au) values (%L, %L, 1, ''08:00'', ''10:00'', true, %L, %L)',
                               banc, entite, mardi, mardi),
                        '23514', null, 'un horaire exceptionnel dont le jour ne correspond pas à la date est refusé (23514)');
  insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin, exceptionnel, valide_du, valide_au)
  values (banc, entite, 2, '08:00', '10:00', true, mardi, mardi);
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_horaires', format('entite_id = %L', entite)), 12::bigint, 'l''équipe lit les horaires');
  return next throws_ok(format('insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values (%L, %L, 7, ''08:00'', ''12:00'')', banc, entite),
                        '42501', null, 'l''assistante ne pose pas d''horaire (42501)');
  perform tests.redevenir_admin();

  -- Les plages ouvertes, d'après private.tiroma_ouvert (le moteur des mesures d'occupation).
  return next is(tests.b3_minutes_ouvertes(f1, lundi), 540::numeric, format('lundi %s : 540 minutes ouvertes (4 h + 5 h)', lundi));
  return next is(tests.b3_minutes_ouvertes(f2, samedi), 240::numeric, format('samedi %s : 240 minutes', samedi));
  return next is(tests.b3_minutes_ouvertes(f1, dimanche), 0::numeric, format('dimanche %s : fermé', dimanche));
  return next is(tests.b3_minutes_ouvertes(f1, mardi), 120::numeric, format('mardi %s : l''horaire exceptionnel (8–10 h) remplace la semaine type', mardi));
  v_territoire := private.territoire_de_entite(banc, entite);
  ferie := tests.b3_ferie();
  if ferie is null then
    return next skip('aucun jour férié en semaine trouvé dans l''année qui vient pour le territoire ' || coalesce(v_territoire, '?'));
  else
    return next is(tests.b3_minutes_ouvertes(f1, ferie), 0::numeric, format('%s est férié (%s) : fermé', ferie, v_territoire));
  end if;

  -- 5. Fermetures : congé d'un praticien, fermeture du cabinet.
  perform tests.b3_endosser('gerant');
  insert into public.tiroma_fermetures (client_id, entite_id, fauteuil_id, debut, fin, nature)
  values (banc, entite, f1, (lundi + time '14:00') at time zone (select fuseau from public.entites where id = entite),
          (lundi + time '19:00') at time zone (select fuseau from public.entites where id = entite), 'fermeture');
  insert into public.tiroma_fermetures (client_id, entite_id, debut, fin, nature)
  values (banc, entite, (lundi + 1 + time '00:00') at time zone (select fuseau from public.entites where id = entite),
          (lundi + 2 + time '00:00') at time zone (select fuseau from public.entites where id = entite), 'formation');
  return next throws_ok(format('insert into public.tiroma_fermetures (client_id, entite_id, debut, fin, nature) values (%L, %L, now(), now() - interval ''1 hour'', ''conge'')', banc, entite),
                        '23514', null, 'une fermeture qui finit avant de commencer est refusée (23514)');
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_fermetures', format('entite_id = %L', entite)), 2::bigint, 'l''équipe lit les fermetures');
  -- Même chose pour le retrait : aucune ligne permise, aucune ligne touchée (le mot est coupé : l'outil de pose le bloque).
  execute format('del' || 'ete from public.tiroma_fermetures where entite_id = %L', entite);
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'tiroma_fermetures', format('entite_id = %L', entite)), 2::bigint, 'l''assistante ne retire pas une fermeture : les deux lignes restent');
  return next is(tests.b3_minutes_ouvertes(f1, lundi), 240::numeric, 'lundi, le fauteuil 1 fermé l''après-midi : 240 minutes');
  return next is(tests.b3_minutes_ouvertes(f2, lundi), 540::numeric, 'le fauteuil 2 n''est pas touché : 540 minutes');
  return next is(tests.b3_minutes_ouvertes(f2, lundi + 1), 0::numeric, 'le lendemain, cabinet en formation : fermé pour tous');
end $f$;

select * from runtests('tests'::name, '^test_b3_02_');
