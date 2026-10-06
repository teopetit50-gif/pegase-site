-- B3-11 — La liste d'attente commune (b3_09) : l'assistante inscrit un patient, il prend sa place dans les candidats
-- d'un créneau libéré, puis elle le retire quand le rendez-vous est pris. Après 00, 00b, b3_01 à b3_09.
-- runtests() annule tout.

create or replace function tests.test_b3_11_liste_attente() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  v_nestor uuid;
  v_mondesir uuid;
  v_attente uuid;
  v_bis uuid;
  c jsonb;
begin
  r := tests.b3_cabinet_releve('initial');
  select id into v_nestor from public.tiroma_patients where entite_id = entite and source_ref = 'P003';
  select id into v_mondesir from public.tiroma_patients where entite_id = entite and source_ref = 'P007';

  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_ajouter_attente(%L, %L, %L, ''soin_conservateur'', 20, null, 60, ''{"x": 1}''::jsonb)', banc, entite, v_nestor),
                        '22023', null, 'des disponibilités qui ne forment pas un tableau sont refusées (22023)');
  v_attente := public.tiroma_ajouter_attente(banc, entite, v_nestor, 'soin_conservateur', 20, null, 60, null, false);
  return next ok(v_attente is not null, 'l''assistante inscrit Rosalie Nestor en liste d''attente (soin, 20 min)');
  return next ok((select l.source = 'tiroma' and l.ajoute_par = tests.b3_compte('referent') and l.famille = 'soin_conservateur' and l.duree_min = 20 and l.retire_le is null
                  from public.tiroma_liste_attente l where l.id = v_attente), 'source « tiroma », inscrite par elle, soin de 20 minutes');
  v_bis := public.tiroma_ajouter_attente(banc, entite, v_nestor, null, 30, null, null, null, true);
  return next is(v_bis, v_attente, 'une seconde inscription du même patient complète la première (une seule entrée ouverte)');
  return next ok((select l.duree_min = 30 and l.drapeau_gene from public.tiroma_liste_attente l where l.id = v_attente), 'durée mise à jour, patient gêné noté');
  return next throws_ok(format('select public.tiroma_ajouter_attente(%L, %L, %L)', banc, entite, v_mondesir), '22023', null, 'un patient « ne pas contacter » ne s''inscrit pas (22023)');
  return next throws_ok(format('select public.tiroma_ajouter_attente(%L, %L, %L, ''radiologie'')', banc, entite, v_nestor), '22023', null, 'une famille inconnue est refusée (22023)');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_ajouter_attente(%L, %L, %L)', banc, entite, v_nestor), '42501', null, 'daf2, sans profil, n''inscrit personne (42501)');
  perform tests.b3_endosser('gerant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.attente_ajoutee'), 'journal : « tiroma.attente_ajoutee »');
  return next is(tests.compter('public', 'tiroma_liste_attente', format('entite_id = %L and retire_le is null', entite)), 3::bigint, 'trois patients en attente (deux du logiciel, un de Tiroma)');
  perform tests.redevenir_admin();

  -- Le créneau libéré : Nestor passe de « contrôle dû » à « liste d'attente » ; gênée, elle passe devant Bazile.
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();
  perform tests.b3_endosser('gerant');
  c := public.tiroma_creneaux_a_sauver(banc, entite) -> 0;
  return next is(c #>> '{candidats,1,origine}' || ':' || (c #>> '{candidats,1,patient_nom}'), 'attente:Rosalie Nestor', '2. Rosalie Nestor, par la liste d''attente : patiente gênée, elle passe devant');
  return next is(c #>> '{candidats,2,origine}' || ':' || (c #>> '{candidats,2,patient_nom}'), 'attente:Kévin Bazile', '3. Kévin Bazile (liste d''attente du logiciel, plus ancienne mais sans gêne)');
  return next ok((c #>> '{candidats,1,attente_id}')::uuid = v_attente, 'le candidat cite son inscription');

  -- Le rendez-vous est pris : l'assistante la retire.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_retirer_attente(%L, ''parti'')', v_attente), '22023', null, 'un motif inconnu est refusé (22023)');
  perform public.tiroma_retirer_attente(v_attente, 'rdv_obtenu');
  return next ok((select l.retire_le is not null and l.motif_retrait = 'rdv_obtenu' from public.tiroma_liste_attente l where l.id = v_attente), 'retirée : rendez-vous obtenu');
  perform public.tiroma_retirer_attente(v_attente, 'autre');
  return next is((select motif_retrait from public.tiroma_liste_attente where id = v_attente), 'rdv_obtenu', 'un second retrait ne change rien');
  perform tests.b3_endosser('gerant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.attente_retiree'), 'journal : « tiroma.attente_retiree »');
  return next is(jsonb_array_length(public.tiroma_creneaux_a_sauver(banc, entite) -> 0 -> 'candidats'), 3, 'le créneau a toujours trois candidats (Nestor revient par le contrôle dû)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_11_');
