-- Tests A4 — lot 67 (a4_75) : TFILED-14, un bloquant apparu après la validation la rend caduque (avant tout
-- règlement), ou lève une alerte critique (réglée ou comptabilisée). Doublures : organisation et fournisseur d'exemple,
-- SIREN fictif à clé fausse (912345629).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_compte, tests.a4_imputer (a4_11_ecritures_fec.sql) et tests.a4_facture_identifiants_lus (a4_62_cles_identifiants.sql),
-- à poser avant. Ce fichier ne supprime rien.

-- Une facture contrôlée « à valider », approuvée par le valideur, la décision exécutée par la file : « validee ».
create or replace function tests.a4_facture_approuvee(p_org jsonb, p_numero text) returns uuid
language plpgsql as $$
declare v_f uuid := tests.a4_facture_identifiants_lus(p_org, p_numero, '{"nom": "Quai des Matériaux d''exemple"}'); v_approbateur uuid;
begin
  if (select statut from public.filed_factures where id = v_f) <> 'a_valider' then
    raise exception 'doublure : % attendue « a_valider », trouvée %', p_numero, (select statut from public.filed_factures where id = v_f);
  end if;
  -- L'approbateur : un membre qui n'a pas saisi la pièce (règle du socle, lot 19c : payload.saisi_par).
  select u into v_approbateur
    from unnest(array[(p_org ->> 'valideur')::uuid, (p_org ->> 'gerant')::uuid]) u
   where not (u = any (private.filed_saisisseurs(v_f)))
   limit 1;
  if v_approbateur is null then raise exception 'doublure : aucun approbateur distinct du saisisseur pour %', p_numero; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_approbateur, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.approbations (demande_id, decision)
  select v.demande_id, 'approuve' from public.filed_validations v where v.facture_id = v_f and v.issue is null;
  reset role;
  -- L'identité ne reste pas : la pièce suivante n'est pas « saisie » par l'approbateur.
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
  if (select statut from public.filed_factures where id = v_f) <> 'validee' then
    raise exception 'doublure : % non validée par la file', p_numero;
  end if;
  return v_f;
end $$;

-- Le recontrôle après que le lecteur a lu un SIREN à clé fausse (F1, TFILED-11).
create or replace function tests.a4_relire_siren_faux(p_f uuid) returns text
language plpgsql as $$
begin
  update public.filed_factures
     set fournisseur_lu = '{"nom": "Quai des Matériaux d''exemple", "non_verifie": {"siren": "912345629", "tva": "FR24912345629"}}'
   where id = p_f;
  return private.filed_controler_facture(p_f);
end $$;

create or replace function tests.a4_alertes(p_f uuid, p_prefixe text) returns setof public.alertes
language sql as $$ select * from public.alertes where cle_regroupement like 'filed:' || p_prefixe || ':' || p_f::text || ':%' $$;

create or replace function tests.test_a4_75_01_validation_caduque() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f1 uuid; v_n bigint; v public.filed_validations;
begin
  -- F1 reconstituée : validée, puis le recontrôle y pose trois bloquants.
  f1 := tests.a4_facture_approuvee(o, 'QDM-2026-1001');
  return next is(tests.a4_relire_siren_faux(f1), 'bloquee', 'Validée, pas réglée, nouveau bloquant : le contrôle rend « bloquee »');
  return next is((select statut from public.filed_factures where id = f1), 'bloquee', 'la facture n''est plus « validee » : hors des exports de paiement');
  return next ok(exists (select 1 from public.filed_validations where facture_id = f1 and issue = 'approuvee' and caduque_le is not null
                         and caduque_motif like '%identite.siren%'), 'Sa validation est caduque, avec le motif ; la décision reste écrite');
  return next ok(exists (select 1 from tests.a4_alertes(f1, 'validation_caduque') a where a.niveau = 'attention'), 'Une alerte est levée');
  return next ok(exists (select 1 from public.filed_historique h where h.objet_id = f1::text and h.etape = 'validation_caduque'), 'L''historique le dit');
  -- Un recontrôle qui retrouve les mêmes bloquants ne relève pas d'alerte.
  select count(*) into v_n from tests.a4_alertes(f1, 'validation_caduque');
  perform private.filed_controler_facture(f1);
  return next is((select count(*) from tests.a4_alertes(f1, 'validation_caduque')), v_n, 'Recontrôlée encore : pas de nouvelle alerte');
  -- Une personne tranche (la pièce est corrigée) : une NOUVELLE demande de validation.
  update public.filed_factures set fournisseur_lu = '{"nom": "Quai des Matériaux d''exemple"}' where id = f1;
  return next is(private.filed_controler_facture(f1), 'a_valider', 'Corrigée : « à valider » de nouveau');
  select * into v from public.filed_validations where facture_id = f1 and issue is null;
  return next ok(v.id is not null and (select cle_idempotence from public.demandes_validation where id = v.demande_id) like '%:r1',
                 'et une nouvelle demande est déposée (l''ancienne, exécutée, ne la couvre plus)');
end $f$;

create or replace function tests.test_a4_75_02_reglee_ou_comptabilisee() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fr uuid; fc uuid;
begin
  -- Réglée (en partie) : rien n'est défait, alerte critique.
  fr := tests.a4_facture_approuvee(o, 'QDM-2026-1011');
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode)
  select client_id, id, document_id, current_date, 100, 'virement' from public.filed_factures where id = fr;
  return next is(tests.a4_relire_siren_faux(fr), 'validee', 'Réglée : la facture reste « validee »');
  return next ok(exists (select 1 from tests.a4_alertes(fr, 'bloquant_apres_reglement') a where a.niveau = 'critique' and a.titre like '%déjà réglée%'),
                 'et une alerte critique est levée');
  return next ok(not exists (select 1 from public.filed_validations where facture_id = fr and caduque_le is not null), 'sa validation n''est pas défaite');
  -- Comptabilisée : idem.
  fc := tests.a4_facture_approuvee(o, 'QDM-2026-1012');
  perform tests.a4_imputer(jsonb_build_object('facture', fc),
          coalesce((select id from public.filed_plan_comptable where client_id = (o ->> 'client')::uuid and numero = '6061'),
                   tests.a4_compte(o, '6061', 'Fournitures non stockables')),
          (select montant_ht from public.filed_factures where id = fc));
  update public.filed_factures set statut = 'comptabilisee' where id = fc;
  return next is(tests.a4_relire_siren_faux(fc), 'comptabilisee', 'Comptabilisée : le statut reste');
  return next ok(exists (select 1 from tests.a4_alertes(fc, 'bloquant_apres_reglement') a where a.niveau = 'critique' and a.titre like '%déjà comptabilisée%'),
                 'et une alerte critique est levée');
end $f$;
