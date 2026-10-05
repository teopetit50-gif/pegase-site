-- 11 — La relance des factures impayées (étape 15, migration b2_02) : jamais sur un litige, une facture réglée ou créditée ;
-- par le cron à l'échéance + 7 jours, trois fois au plus ; à la main par l'agence.

create or replace function tests.test_b2_11_relances() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; f2 public.loc_factures; r jsonb; n integer;
begin
  if to_regprocedure('private.loc_relancer_factures(timestamptz)') is null then
    return next fail('La migration b2_02 (relances) n''est pas posée : private.loc_relancer_factures manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into f2 from public.loc_factures where client_id = v_client and nature = 'dommages';

  -- Le passage du cron le jour même : rien à relancer (échéance à réception, 7 jours de grâce).
  n := private.loc_relancer_factures(now());
  return next is(n, 0, 'Le jour de la facture, rien n''est relancé');
  -- Dix jours plus tard : les deux factures sont relancées (ou dites « non réglé » sans réglage d'envoi).
  n := private.loc_relancer_factures(now() + interval '10 days');
  select * into f from public.loc_factures where id = f.id;
  if f.relances = 1 then
    return next is(n, 2, 'Dix jours après l''échéance, les deux factures sont relancées');
    return next ok(f.relance_le is not null, 'La date de relance est posée');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_relancee') >= 2, 'Le journal opposable porte tavaro.facture_relancee');
    return next is(tests.compter('public', 'envois', format('client_id = %L and module = %L and cle = %L', v_client, 'tavaro', 'tavaro:relance:' || f.id::text || ':1')), 1::bigint, 'Un envoi à la clé tavaro:relance:<facture>:1');
    -- Pas deux fois dans les quatorze jours ; puis la deuxième, la troisième et l'alerte de recouvrement.
    n := private.loc_relancer_factures(now() + interval '12 days');
    return next is(n, 0, 'Deux jours plus tard, pas de nouvelle relance (quatorze jours entre deux)');
    n := private.loc_relancer_factures(now() + interval '25 days');
    return next is(n, 2, 'Quinze jours après la première : la deuxième');
    n := private.loc_relancer_factures(now() + interval '40 days');
    return next is(n, 2, 'La troisième');
    return next is((select x.relances from public.loc_factures x where x.id = f.id), 3::smallint, 'Trois relances comptées');
    return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle = %L', v_client, 'facture:recouvrement:' || f.id::text)) >= 1, 'À la troisième, l''alerte de recouvrement est levée pour l''agence');
    n := private.loc_relancer_factures(now() + interval '60 days');
    return next is(n, 0, 'Pas de quatrième relance par le cron');
  else
    return next diag('Sans reglages_envois pour le loueur d''essai, la relance dit « non réglé » : ' || (select x.relances from public.loc_factures x where x.id = f.id));
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_relance_non_regle') >= 2, 'Sans réglage d''envoi, le journal porte tavaro.facture_relance_non_regle et une alerte « relancez-la vous-même »');
  end if;

  -- La facture immuable l'est toujours, mais ses colonnes de suivi avancent.
  return next throws_ok(format('update public.loc_factures set total_ttc = 1 where id = %L', f.id), '42501', null, 'Le tuple immuable de la facture est intact');
  return next lives_ok(format('update public.loc_factures set relance_le = now() where id = %L', f.id), 'Les colonnes de suivi de relance avancent (comme le règlement)');

  -- Jamais sur un litige, une facture réglée, ni une facture créditée.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  perform public.loc_marquer_litige(f2.id, 'Le client conteste la rayure.');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f2.id), '23514', null, 'Une facture en litige ne se relance pas');
  perform public.loc_marquer_reglee(f.id, 'virement');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f.id), '23514', null, 'Une facture réglée ne se relance pas');
  perform tests.redevenir_admin();
  n := private.loc_relancer_factures(now() + interval '100 days');
  return next is(n, 0, 'Le cron ne relance ni la réglée ni le litige');

  -- La relance à la main par l'agence, hors délai de grâce ; un autre loueur ne peut pas.
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f.id), 'P0002', null, 'Un autre loueur ne relance pas cette facture');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_relancer_facture(f.id);
  perform tests.redevenir_admin();
  return next ok(r ->> 'statut' in ('prepare', 'non_regle'), format('L''agence relance à la main dès le jour même (%s)', r ->> 'statut'));
  if r ->> 'statut' = 'prepare' then
    return next is((r ->> 'relance')::int, 1, 'C''est la première relance de cette facture');
    return next is((select x.relances from public.loc_factures x where x.id = f.id), 1::smallint, 'Comptée sur la facture');
  end if;
end $f$;

select * from runtests('tests'::name, '^test_b2_11_');
