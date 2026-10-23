-- Tests A4 — lot 76 (a4_84) : TFILED-27, le refus d'un second avis donne l'heure de l'entité (ici la Guadeloupe).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Données d'exemple ; ce fichier ne supprime rien.

create or replace function tests.test_a4_84_01_avis_heure_entite() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v uuid := (o ->> 'valideur')::uuid; fa jsonb; v_d uuid; v_le timestamptz; v_msg text;
begin
  update public.entites set fuseau = 'America/Guadeloupe' where id = (o ->> 'entite')::uuid;
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_regler_circuit((o ->> 'client')::uuid, null, null, 1000, null, 2, array['gerant', 'admin', 'valideur']);
  reset role;
  fa := tests.a4_facture(o, 'ia', 'HEURE-001', 1200);
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  select x.demande_id into v_d from public.filed_validations x where x.facture_id = (fa ->> 'facture')::uuid and x.issue is null;
  reset role; perform tests.a4_comme(v);
  insert into public.approbations (demande_id, decision) values (v_d, 'approuve');
  begin
    insert into public.approbations (demande_id, decision) values (v_d, 'approuve');
  exception when others then v_msg := sqlerrm;
  end;
  reset role;
  select decide_le into v_le from public.approbations where demande_id = v_d;
  return next is(v_msg,
    format('Vous avez déjà donné votre avis sur cette demande (approuvée le %s) : il compte déjà.',
           to_char(v_le at time zone 'America/Guadeloupe', 'DD/MM/YYYY à HH24:MI')),
    'L''heure est celle de l''entité (America/Guadeloupe)');
end $f$;
