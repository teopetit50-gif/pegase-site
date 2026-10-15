-- Tests A4 — lot 22 (a4_30) : un changement d'IBAN chez un fournisseur connu déclenche une alerte.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10) et tests.a4_inserer (a4_16_rapprochement_3voies.sql).
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. IBAN d'exemple seulement.

-- Un IBAN de fournisseur, à l'état donné. Rend son id.
create or replace function tests.a4_iban(p_org jsonb, p_fournisseur uuid, p_iban text, p_statut text) returns uuid
language sql as $$
  select tests.a4_inserer('public.filed_fournisseurs_ibans', jsonb_build_object(
    'client_id', p_org ->> 'client', 'fournisseur_id', p_fournisseur, 'iban', p_iban,
    'iban_masque', left(p_iban, 4) || '…' || right(p_iban, 4), 'empreinte', encode(sha256(convert_to(p_iban, 'UTF8')), 'hex'),
    'statut', p_statut, 'propose_le', now()))
$$;

create or replace function tests.test_a4_30_01_changement() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_four uuid := (o ->> 'fournisseur')::uuid; v_n uuid; a public.alertes;
begin
  perform tests.a4_iban(o, v_four, 'FR7630006000011234567890189', 'valide');
  return next is((select count(*) from public.alertes where client_id = v_cl and cle_regroupement like 'filed:iban_changement:%'), 0::bigint,
                 'Un premier IBAN n''est pas un changement');
  v_n := tests.a4_iban(o, v_four, 'DE89370400440532013000', 'propose');
  select * into a from public.alertes where client_id = v_cl and cle_regroupement = 'filed:iban_changement:' || v_n;
  return next is(a.niveau, 'critique', 'Un nouvel IBAN chez un fournisseur connu : alerte critique');
  return next is(a.interne, false, 'adressée au client, pas seulement à Omega');
  return next ok(a.titre like 'Changement d''IBAN demandé pour Fournisseur structuré d''exemple : FR76…0189 → DE89…3000%', 'avec l''ancien et le nouvel IBAN masqués');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_cl and action = 'filed.iban.changement'), 'Au journal');
  return next ok(exists (select 1 from public.filed_historique where objet_id = v_four::text and etape = 'iban_changement'), 'À l''historique du fournisseur');
  update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now() where id = v_n;
  return next ok((select acquittee_le is not null from public.alertes where id = a.id), 'Le nouvel IBAN validé par une personne : l''alerte est acquittée');
  return next ok(exists (select 1 from public.filed_historique where objet_id = v_four::text and etape = 'iban_changement_decide'
                          and message like '%confirmé par une personne%'), 'et la décision historisée');
end $f$;

create or replace function tests.test_a4_30_02_refus_et_nouvelle_tentative() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_four uuid := (o ->> 'fournisseur')::uuid; v_n uuid;
begin
  perform tests.a4_iban(o, v_four, 'FR7630006000011234567890189', 'valide');
  v_n := tests.a4_iban(o, v_four, 'DE89370400440532013000', 'propose');
  update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now() where id = v_n;
  return next ok((select acquittee_le is not null from public.alertes where cle_regroupement = 'filed:iban_changement:' || v_n), 'Refusé : alerte acquittée');
  return next ok(exists (select 1 from public.filed_historique where objet_id = v_four::text and message like '%refusé, l''ancien IBAN reste%'), 'refus historisé');
  v_n := tests.a4_iban(o, v_four, 'GB82WEST12345698765432', 'propose');
  return next ok(exists (select 1 from public.alertes where cle_regroupement = 'filed:iban_changement:' || v_n and acquittee_le is null),
                 'Une autre tentative, un autre IBAN : nouvelle alerte');
end $f$;

create or replace function tests.test_a4_30_03_sans_ancien_valide() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_four uuid := (o ->> 'fournisseur')::uuid;
begin
  perform tests.a4_iban(o, v_four, 'FR7630006000011234567890189', 'refuse');
  perform tests.a4_iban(o, v_four, 'DE89370400440532013000', 'propose');
  return next is((select count(*) from public.alertes where client_id = v_cl and cle_regroupement like 'filed:iban_changement:%'), 0::bigint,
                 'Sans IBAN validé auparavant, pas de changement : la validation ordinaire suffit');
  return next ok(not has_function_privilege('authenticated', 'private.filed_iban_changement()', 'execute'), 'Fonction de déclencheur fermée');
end $f$;
