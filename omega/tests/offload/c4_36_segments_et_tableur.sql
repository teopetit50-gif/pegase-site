-- c4_36 — OFFLOAD : la valeur en jeu par segment, et la restitution en tableur (session C4, 25/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_36. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_36_segments_et_tableur() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_b uuid; v_collab uuid;
  seg jsonb; tab jsonb;
  v_csv text;
begin
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('SG1', 'Bâti Sud', 'achats@bati-sud.test', 70);
  v_b := tests.c4_compte_courriel('SG2', 'Cabinet "Les Pins"; Dentaire', 'cabinet@les-pins.test', 70);
  update public.offload_comptes set secteur = 'BTP' where id = v_a;
  update public.offload_comptes set secteur = 'Santé' where id = v_b;
  perform private.offload_detecter(v_client, null);

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  seg := public.offload_valeur_par_segment(v_client);
  tab := public.offload_restitution_tableur(v_client);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from jsonb_array_elements(seg) x where x ->> 'segment' = 'BTP'
                         and (x ->> 'a_risque')::int >= 1 and (x ->> 'valeur_en_jeu')::numeric > 0)
                 and exists (select 1 from jsonb_array_elements(seg) x where x ->> 'segment' = 'Santé'),
                 'La valeur en jeu se lit par segment : ' || left(seg::text, 200));
  v_csv := tab -> 'fichiers' ->> 'offload-comptes.csv';
  return next ok(v_csv is not null and split_part(v_csv, E'\n', 1) like '%nom%' and split_part(v_csv, E'\n', 1) like '%;%',
                 'La restitution se télécharge en tableur : un fichier CSV par famille, avec son en-tête');
  return next ok(position('"Cabinet ""Les Pins""; Dentaire"' in v_csv) > 0,
                 'Une cellule avec « ; » ou des guillemets est protégée comme le veut le format CSV');

  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-segments@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-segments@banc-varelo.test');
  return next throws_ok(format('select public.offload_restitution_tableur(%L::uuid)', v_client), '42501', null,
                        'Seuls le gérant et l''administrateur téléchargent la restitution');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_36_');
