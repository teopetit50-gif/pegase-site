-- c4_34 — OFFLOAD : les échéances des contrats à reconduction sont signalées à temps (session C4, 23/10/2026).
-- Promesses C:73 et C:75. Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_34. Mode essai. runtests() annule tout.

create or replace function tests.test_c4_34_contrats_a_reconduction() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid; v_y uuid;
  v_jour date;
  t jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_jour := (now() at time zone private.offload_fuseau(v_client))::date;
  v_x := tests.c4_compte_courriel('CT1', 'Clinique des Iles', 'technique@clinique-iles.test', 70);
  -- Deux comptes : un contrat plus tardif du même compte « couvre » l'autre (règle c4_07).
  v_y := tests.c4_compte_courriel('CT2', 'Hôtel du Port', 'technique@hotel-port.test', 70);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_saisir_contrat(v_x, 'CT-O10', v_jour + 58, '{"libelle": "Maintenance climatisation", "reconduction": "tacite"}');
  perform public.offload_saisir_contrat(v_y, 'CT-EXP', v_jour + 30, '{"libelle": "Entretien chaudière", "reconduction": "expresse"}');
  perform public.offload_saisir_contrat(v_x, 'CT-LOIN', v_jour + 200, '{"libelle": "Contrôle annuel", "reconduction": "tacite"}');
  perform tests.redevenir_admin();
  perform private.offload_echeances_cycle(v_client, null);

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  t := public.offload_echeances_tableau(v_client);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from jsonb_array_elements(t) x where x -> 'contrat' ->> 'numero' = 'CT-O10'
                         and (x ->> 'due_le')::date = v_jour + 58 and x ->> 'phrase' like '%se reconduit tacitement%'),
                 'Un contrat à reconduction tacite est signalé 60 jours avant son échéance, avec ce qu''il faut savoir');
  return next ok(exists (select 1 from jsonb_array_elements(t) x where x -> 'contrat' ->> 'numero' = 'CT-EXP'
                         and (x ->> 's_eteint')::boolean),
                 'Un contrat sans reconduction tacite reste signalé comme s''éteignant');
  return next ok(not exists (select 1 from jsonb_array_elements(t) x where x -> 'contrat' ->> 'numero' = 'CT-LOIN'),
                 'Une échéance de contrat lointaine (plus de 60 jours) n''encombre pas le tableau');
end $f$;

select * from runtests('tests'::name, '^test_c4_34_');
