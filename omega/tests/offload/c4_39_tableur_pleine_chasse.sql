-- c4_39 — OFFLOAD : les signes de formule en pleine chasse sont neutralisés dans la restitution en tableur (TMOD-14 ;
-- session C4, 27/10/2026). Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_39. runtests() annule tout.

create or replace function tests.test_c4_39_tableur_pleine_chasse() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_f uuid;
  tab jsonb;
  v_comptes text;
begin
  perform tests.c4_reprises_pretes();
  v_f := tests.c4_compte_courriel('PC1', '＝1+1', 'achats@pleine-chasse.test', 70);
  update public.offload_comptes set contact = '＋1', secteur = '－1', ville = '＠SUM(1)' where id = v_f;
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  tab := public.offload_restitution_tableur(v_client);
  perform tests.redevenir_admin();
  v_comptes := tab -> 'fichiers' ->> 'offload-comptes.csv';
  return next ok(position('''＝1+1' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)＝1\+1',
                 'Un « ＝ » en pleine chasse en tête de cellule est neutralisé');
  return next ok(position('''＋1' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)＋1'
                 and position('''－1' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)－1'
                 and position('''＠SUM(1)' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)＠SUM',
                 'De même pour « ＋ », « － » et « ＠ »');
  return next ok(private.offload_csv_neutre(E'\t=1') = E'''\t=1' and private.offload_csv_neutre(E'\r=1') = E'''\r=1'
                 and private.offload_csv_neutre('=1') = '''=1' and private.offload_csv_neutre('Ｍartin ＝ 1') = 'Ｍartin ＝ 1',
                 'La tabulation et le retour chariot le restent ; un signe hors de la tête de cellule ne change rien');
end $f$;

select * from runtests('tests'::name, '^test_c4_39_');
