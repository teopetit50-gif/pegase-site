-- c4_11 — OFFLOAD : un compte en litige ou en retard de paiement chez CASHD sort de la vague commerciale (C4, 15/10/2026).
-- Après c4_00, c4_02, c4_03, c4_08 (aides) et les migrations c4_01 à c4_11 ; CASHD (c2_01 à c2_03) posé sur le banc.
-- runtests() annule tout.

create or replace function tests.c4_cashd_compte(p_ref text, p_statut text default 'actif') returns uuid
language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  v uuid;
begin
  insert into public.cashd_comptes (client_id, entite_id, reference, nom, statut)
  values ((banc ->> 'client')::uuid, (banc ->> 'entite')::uuid, p_ref, 'Compte CASHD ' || p_ref, p_statut)
  returning id into v;
  return v;
end $$;

create or replace function tests.c4_cashd_facture(p_compte uuid, p_numero text, p_echeance_dans integer, p_statut text default 'ouverte') returns uuid
language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  v uuid;
begin
  insert into public.cashd_factures (client_id, entite_id, compte_id, numero, date_emission, echeance, montant_ttc, statut)
  values ((banc ->> 'client')::uuid, (banc ->> 'entite')::uuid, p_compte, p_numero, current_date - 60, current_date + p_echeance_dans, 1200, p_statut)
  returning id into v;
  return v;
end $$;

create or replace function tests.test_c4_11_impayes() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_litige uuid; v_retard uuid; v_sain uuid; v_aff uuid;
  i jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_litige := tests.c4_compte_courriel('IMP-L', 'Garage en litige', 'litige@impayes.test', 70);
  v_retard := tests.c4_compte_courriel('IMP-R', 'Garage en retard', 'retard@impayes.test', 70);
  v_sain := tests.c4_compte_courriel('IMP-S', 'Garage à jour', 'ajour@impayes.test', 70);
  perform tests.c4_cashd_compte('IMP-L', 'litige');
  perform tests.c4_cashd_facture(tests.c4_cashd_compte('IMP-R'), 'F-IMP-1', -20);
  perform tests.c4_cashd_facture(tests.c4_cashd_compte('IMP-S'), 'F-IMP-2', 15);

  return next ok(private.offload_ecarte(v_litige) like 'Impayé : compte en litige chez CASHD%',
                 'Jamais un compte en litige : ' || coalesce(private.offload_ecarte(v_litige), 'rien'));
  return next ok(private.offload_ecarte(v_retard) like 'Impayé : facture F-IMP-1 échue depuis 20 jours chez CASHD%ne se croisent jamais.',
                 'Une facture en retard sort le compte de la vague commerciale : ' || coalesce(private.offload_ecarte(v_retard), 'rien'));
  return next is(private.offload_ecarte(v_sain), null, 'Une facture pas encore échue ne l''écarte pas');

  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  return next ok(not exists (select 1 from public.offload_reprises r where r.compte_id in (v_litige, v_retard))
                 and exists (select 1 from public.offload_reprises r where r.compte_id = v_sain),
                 'La vague ne sollicite ni le compte en litige ni le compte en retard ; le compte à jour, si');

  -- Le rappel de retrait n'est pas une relance commerciale : il part, sans un mot de paiement.
  v_aff := tests.c4_affaire(v_litige, 'CMD-IMP', 9, '{"libelle": "Batterie"}');
  perform private.offload_affaires_cycle(v_client, null);
  return next ok((tests.c4_affaire_lue(v_aff)).envoi1_id is not null, 'Le rappel de retrait d''une pièce arrivée part quand même');

  i := private.offload_interpreter_regle('Ne relance jamais un compte en litige.');
  return next ok(i ->> 'statut' = 'appliquee', 'La règle écrite « jamais un compte en litige » est désormais applicable');
end $f$;

select * from runtests('tests'::name, '^test_c4_11_');
