-- VARELO — trois vrais petits groupes multi-sociétés, d'après les comptes annuels publiés (B1, 18/10/2026)
-- Écrit par omega/banc/varelo_groupes_publics.py ; ne pas modifier à la main. À poser sur la RECETTE seulement.
-- Chiffres : « Ratios financiers (BCE / INPI) », data.economie.gouv.fr, Licence Ouverte v2.0 — comptes annuels
-- déposés à l'INPI, lignes publiques, comptes sociaux. Liens mère / filiales : Wikidata (P749), CC0.
-- Chaque société reçoit la balance de son dernier exercice publié et, s'il existe, celle du précédent (l'écart
-- sur l'an dernier). Ni trésorerie (absente du jeu ouvert), ni caisse : les caisses du banc restent fictives, et leur
-- source le dit désormais (« Z fictif (banc) »), ce que l'écran affiche.
-- Idempotent : chaque écriture est gardée (on conflict do nothing, not exists). Rien n'est supprimé.
-- Les trois gérants n'ont pas de mot de passe utilisable : le coordinateur le pose comme pour les comptes du banc.

do $banc$
declare
  v_entite uuid;
begin
  -- Groupe EDH (comptes publiés)
  insert into public.clients (id, nom) values ('cccccccc-0000-4000-8000-000000000101', 'Groupe EDH (comptes publiés)') on conflict do nothing;
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values ('cccccccc-0000-4000-8000-0000000001c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gerant-edh@banc-varelo.test', '',
          now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false)
  on conflict do nothing;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values ('cccccccc-0000-4000-8000-0000000001c1', 'cccccccc-0000-4000-8000-000000000101', 'gerant', true)
  on conflict do nothing;
  perform public.grp_installer('cccccccc-0000-4000-8000-000000000101');
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000101' and e.siren = '381224054';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000101', 'Groupe EDH', '381224054', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2023-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2023-08-31'::date, '2022-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-23451167.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "12571367.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "10879800.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2023, SIREN 381224054');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2024-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2024-08-31'::date, '2023-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-26199132.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "14325162.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "11873970.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2024, SIREN 381224054');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000101' and e.siren = '852953629';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000101', 'EFAP', '852953629', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2023-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2023-08-31'::date, '2022-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-3366570.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "3154273.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "212297.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2023, SIREN 852953629');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2024-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2024-08-31'::date, '2023-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-4069606.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "3969126.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "100480.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2024, SIREN 852953629');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000101' and e.siren = '478968100';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000101', 'École française de journalisme', '478968100', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2023-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2023-08-31'::date, '2022-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-601265.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "724302.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-123037.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2023, SIREN 478968100');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000101' and d.entite_id = v_entite and d.arrete_le = '2024-08-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000101', v_entite, '2024-08-31'::date, '2023-09-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-662613.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "732250.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-69637.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/08/2024, SIREN 478968100');
  end if;

  -- Ankama (comptes publiés)
  insert into public.clients (id, nom) values ('cccccccc-0000-4000-8000-000000000102', 'Ankama (comptes publiés)') on conflict do nothing;
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values ('cccccccc-0000-4000-8000-0000000002c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gerant-ankama@banc-varelo.test', '',
          now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false)
  on conflict do nothing;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values ('cccccccc-0000-4000-8000-0000000002c1', 'cccccccc-0000-4000-8000-000000000102', 'gerant', true)
  on conflict do nothing;
  perform public.grp_installer('cccccccc-0000-4000-8000-000000000102');
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000102' and e.siren = '437785223';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000102', 'Ankama', '437785223', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-5569797.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "9906641.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-4336844.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 437785223');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-5944350.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "9275405.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-3331055.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 437785223');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000102' and e.siren = '494163744';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000102', 'Ankama Animations', '494163744', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-1105075.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "4483194.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-3378119.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 494163744');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-1823068.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "4935014.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-3111946.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 494163744');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000102' and e.siren = '492360169';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000102', 'Ankama Éditions', '492360169', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-2241251.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "3446619.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-1205368.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 492360169');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-1993143.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "3131526.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-1138383.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 492360169');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000102' and e.siren = '492360730';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000102', 'Ankama Games', '492360730', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-29924890.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "26611744.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "3313146.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 492360730');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000102' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000102', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-37515842.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "28029233.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "9486609.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 492360730');
  end if;

  -- Normaxis (comptes publiés)
  insert into public.clients (id, nom) values ('cccccccc-0000-4000-8000-000000000103', 'Normaxis (comptes publiés)') on conflict do nothing;
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values ('cccccccc-0000-4000-8000-0000000003c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gerant-normaxis@banc-varelo.test', '',
          now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false)
  on conflict do nothing;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values ('cccccccc-0000-4000-8000-0000000003c1', 'cccccccc-0000-4000-8000-000000000103', 'gerant', true)
  on conflict do nothing;
  perform public.grp_installer('cccccccc-0000-4000-8000-000000000103');
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000103' and e.siren = '823618582';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000103', 'Normaxis', '823618582', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000103' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000103', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-265000.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "272613.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "-7613.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 823618582');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000103' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000103', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-300000.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "295058.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "4942.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 823618582');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000103' and e.siren = '511587792';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000103', 'Arkemep', '511587792', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000103' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000103', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-1429601.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "1402389.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "27212.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 511587792');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000103' and d.entite_id = v_entite and d.arrete_le = '2024-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000103', v_entite, '2024-12-31'::date, '2024-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-1110865.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "1032047.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "78818.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2024, SIREN 511587792');
  end if;
  select e.id into v_entite from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-000000000103' and e.siren = '883963993';
  if v_entite is null then
    v_entite := public.grp_ajouter_societe('cccccccc-0000-4000-8000-000000000103', 'Arkenor', '883963993', 'FR');
  end if;
  if not exists (select 1 from public.grp_balances_depots d
                 where d.client_id = 'cccccccc-0000-4000-8000-000000000103' and d.entite_id = v_entite and d.arrete_le = '2023-12-31') then
    perform private.grp_deposer_balance('cccccccc-0000-4000-8000-000000000103', v_entite, '2023-12-31'::date, '2023-01-01'::date,
      '[{"compte": "706000", "libelle": "Chiffre d''affaires publié", "solde": "-444282.00"}, {"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)", "solde": "402867.00"}, {"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": "41415.00"}]'::jsonb,
      'Comptes annuels publiés (INPI), exercice clos le 31/12/2023, SIREN 883963993');
  end if;

  -- Les caisses du banc Sogexal sont inventées : leur source le dit, l'écran l'affiche (Caisses.tsx).
  update public.grp_ventes_caisse set source = left('Z fictif (banc) — ' || coalesce(source, 'dépôt'), 200)
  where client_id = 'cccccccc-0000-4000-8000-00000000000c' and coalesce(source, '') !~* 'fictif';
end $banc$;

-- Contrôle (lecture seule) : 10 sociétés, 19 balances, ventes et résultat par société.
select c.nom as groupe, g.societe, g.arrete_le, g.ventes, g.resultat, g.ventes_n1, g.source
from public.grp_groupe_page g join public.clients c on c.id = g.client_id
where g.client_id in ('cccccccc-0000-4000-8000-000000000101', 'cccccccc-0000-4000-8000-000000000102', 'cccccccc-0000-4000-8000-000000000103')
order by c.nom, g.societe;
