-- 28 — L'audit des retours et l'indicateur du mois (migration b2_19) : un retour passé chiffré par simulation, face à
-- ce qui avait été facturé ; aucune proposition ni facture ne reste ; l'écart par famille ; l'audit clos donne
-- l'« avant » de l'indicateur.

create or replace function tests.test_b2_28_audit_retours() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_audit uuid; r jsonb;
begin
  if to_regprocedure('public.loc_auditer_retour(uuid, uuid, jsonb, numeric)') is null then
    return next fail('La migration b2_19 (audit des retours) n''est pas posée : public.loc_auditer_retour manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_audit(%L)', 'Audit'), '42501', null, 'Un collaborateur n''ouvre pas d''audit');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_audit := (public.loc_ouvrir_audit('Vingt retours de septembre') ->> 'audit')::uuid;
  return next throws_ok(format('select public.loc_auditer_retour(%L::uuid, %L::uuid, %L::jsonb, -1)', v_audit, v_contrat, tests.tavaro_retour()), '22023', null, 'Le montant facturé à l''époque est obligatoire et positif');
  r := public.loc_auditer_retour(v_audit, v_contrat, tests.tavaro_retour(), 60);
  return next ok((r ->> 'chiffre_ttc')::numeric > 60 and (r ->> 'ecart_ttc')::numeric = (r ->> 'chiffre_ttc')::numeric - 60,
                 format('Le retour est rechiffré sur le barème (%s €) face aux 60 € facturés à l''époque', r ->> 'chiffre_ttc'));
  return next ok(jsonb_array_length(r -> 'lignes') >= 2, 'Le détail du chiffrage est gardé');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'loc_propositions', format('client_id = %L and contrat_id = %L', v_client, v_contrat)), 0::bigint, 'La simulation ne laisse aucune proposition');
  return next is(tests.compter('public', 'loc_factures', format('client_id = %L', v_client)), 0::bigint, 'Ni aucune facture');

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_resultat_audit(v_audit);
  return next ok((r ->> 'retours')::int = 1 and (r ->> 'retours_sous_factures')::int = 1 and r -> 'par_famille' ? 'carburant', 'Le résultat compte le retour sous-facturé, par famille de frais');
  return next throws_ok(format('select public.loc_resultat_audit(%L::uuid, true)', v_audit), '42501', null, 'Un valideur ne clôt pas l''audit');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_resultat_audit(v_audit, true);
  return next is(r ->> 'statut', 'clos', 'La direction clôt l''audit');
  r := public.loc_indicateur_mois();
  return next is((r ->> 'avant_pour_100_retours')::numeric, 6000::numeric, 'L''indicateur garde l''« avant » de l''audit clos : 6 000 € pour cent retours');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_resultat_audit(%L::uuid)', v_audit), 'P0002', null, 'Un autre loueur ne voit pas l''audit');
end $f$;

select * from runtests('tests'::name, '^test_b2_28_');
