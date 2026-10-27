-- c4_14 — OFFLOAD : chantiers réceptionnés et missions closes, comptés comme le dernier passage (C4, 15/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_14. runtests() annule tout.

create or replace function tests.test_c4_14_chantiers_et_missions() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_bt uuid; v_cs uuid;
  s public.offload_signaux;
  r public.offload_reprises;
  e public.envois;
begin
  perform tests.c4_reprises_pretes();
  perform tests.c4_deposer('clients', jsonb_build_array(
    jsonb_build_object('compte_ref', 'BT14', 'nom', 'SCI Les Tilleuls', 'contact', 'Mme Robin', 'email', 'gestion@tilleuls.test'),
    jsonb_build_object('compte_ref', 'CS14', 'nom', 'Cabinet Ferrand SAS', 'email', 'direction@ferrand.test')), 'p14-clients');
  select c.id into v_bt from public.offload_comptes c where c.client_id = v_client and c.ref = 'BT14';
  select c.id into v_cs from public.offload_comptes c where c.client_id = v_client and c.ref = 'CS14';
  -- Le cabinet a déjà sa facture de mission dans l'historique des ventes.
  perform tests.c4_deposer('ventes', jsonb_build_array(
    jsonb_build_object('compte_ref', 'CS14', 'date', to_char(current_date - 300, 'DD/MM/YYYY'), 'montant', '12 000,00', 'reference', 'M-2025-07')), 'p14-ventes');

  perform tests.c4_deposer('chantiers', jsonb_build_array(
    jsonb_build_object('compte_ref', 'BT14', 'reference', 'CH-118', 'libelle', 'Extension de l''entrepôt', 'receptionne_le', to_char(current_date - 400, 'DD/MM/YYYY'),
                       'montant', '85 000,00')), 'p14-chantiers');
  perform tests.c4_deposer('missions', jsonb_build_array(
    jsonb_build_object('compte_ref', 'CS14', 'reference', 'M-2025-07', 'libelle', 'Audit de la paie', 'close_le', to_char(current_date - 280, 'DD/MM/YYYY'),
                       'montant', '12 000,00')), 'p14-missions');

  return next ok(exists (select 1 from public.offload_achats a where a.compte_id = v_bt and a.date_achat = current_date - 400
                         and a.libelle = 'Chantier « Extension de l''entrepôt » réceptionné' and a.montant_ht = 85000),
                 'Le chantier réceptionné devient le dernier passage du compte, avec son montant');
  return next ok(exists (select 1 from public.offload_achats a where a.compte_id = v_cs and a.libelle = 'Mission « Audit de la paie » close'
                         and a.montant_ht = 0),
                 'La mission close compte comme passage, sans compter deux fois les honoraires déjà facturés');

  perform private.offload_detecter(v_client, null);
  select * into s from public.offload_signaux x where x.compte_id = v_bt;
  return next ok(s.dernier_achat = current_date - 400 and s.niveau not in ('ok', 'sans_achat'),
                 'Le dernier passage remonte au-delà du délai fixé : le compte est signalé (' || coalesce(s.niveau, '?') || ')');
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_bt);
  select * into e from public.envois x where x.id = r.envoi1_id;
  return next ok(e.corps like '%Chantier « Extension de l''entrepôt » réceptionné%',
                 'Le mot proposé au client reprend son chantier réceptionné : ' || coalesce(left(e.corps, 200), 'aucun message'));
  return next ok((select x.dernier_achat from public.offload_signaux x where x.compte_id = v_cs) = current_date - 280,
                 'Pour le conseil, la mission close date le dernier passage');
end $f$;

select * from runtests('tests'::name, '^test_c4_14_');
