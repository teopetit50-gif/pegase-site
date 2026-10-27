-- c4_31 — OFFLOAD : le fuseau de l'organisation remplace l'heure de Paris fixe (session C4, 22/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_31. runtests() annule tout.
-- Deux fuseaux lointains (Kiritimati, UTC+14 ; Pago Pago, UTC-11) : à toute heure, la date de l'un des deux diffère de
-- celle de Paris ; le test ne dépend donc pas de l'heure à laquelle il tourne.

create or replace function tests.test_c4_31_fuseau_organisation() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid;
  v_fuseau text;
  v_jour date;
  v_ok boolean;
begin
  perform tests.c4_reprises_pretes();
  v_x := tests.c4_compte_courriel('FZ1', 'Garage Lointain', 'atelier@garage-lointain.test', 70);
  foreach v_fuseau in array array['Pacific/Kiritimati', 'Pacific/Pago_Pago'] loop
    update public.entites set fuseau = v_fuseau where client_id = v_client and principale;
    v_jour := (now() at time zone v_fuseau)::date;
    return next is(private.offload_fuseau(v_client), v_fuseau, 'OFFLOAD lit le fuseau de l''organisation : ' || v_fuseau);
    return next is((private.offload_detecter(v_client, null) ->> 'jour')::date, v_jour,
                   'La détection date son jour dans le fuseau de l''organisation (' || v_fuseau || ')');
    perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
    begin
      perform public.offload_noter_contact(v_x, v_jour, 'appel', 'Sophie', 'Contact du ' || v_jour);
      v_ok := true;
    exception when others then
      v_ok := false;
    end;
    return next ok(v_ok, 'Un contact daté d''aujourd''hui dans le fuseau de l''organisation est accepté (' || v_fuseau || ')');
    return next throws_ok(format('select public.offload_noter_contact(%L::uuid, %L::date, %L)', v_x, v_jour + 1, 'appel'), '22023', null,
                          'Le lendemain, dans ce fuseau, est refusé (' || v_fuseau || ')');
    perform tests.redevenir_admin();
  end loop;
end $f$;

select * from runtests('tests'::name, '^test_c4_31_');
