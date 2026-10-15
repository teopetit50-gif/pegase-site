-- c4_07 — OFFLOAD : échéances et renouvellements (session C4, 06/10/2026). Après c4_00, c4_02, c4_03 (aides) et les
-- migrations c4_01 à c4_07. runtests() annule tout. Dates relatives au jour du test.

-- Un équipement d'un compte, en admin : dernière intervention telle que l'échéance tombe dans p_dans jours.
create or replace function tests.c4_equipement(p_compte uuid, p_ref text, p_designation text, p_dans integer,
                                               p_nature text default 'commerciale', p_site text default null, p_periodicite integer default 12)
returns uuid language plpgsql as $$
declare c public.offload_comptes; v uuid;
begin
  perform tests.redevenir_admin();
  select * into c from public.offload_comptes where id = p_compte;
  insert into public.offload_equipements (client_id, entite_id, compte_id, ref, designation, site, type_entretien, periodicite_mois, nature,
                                          derniere_intervention, source)
  values (c.client_id, c.entite_id, c.id, p_ref, p_designation, p_site, 'Entretien annuel', p_periodicite, p_nature,
          ((current_date + p_dans) - make_interval(months => p_periodicite))::date, 'saisie')
  returning id into v;
  return v;
end $$;

create or replace function tests.c4_echeance(p_equipement uuid) returns public.offload_echeances
language sql stable as $$ select * from public.offload_echeances h where h.equipement_id = p_equipement and h.type = 'entretien'
                          order by h.due_le desc limit 1 $$;

create or replace function tests.test_c4_07_echeances() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_c uuid; v_chaud uuid; v_jour uuid; v_loin uuid; v_regl uuid;
  h public.offload_echeances;
  e public.envois;
  r jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_c := tests.c4_compte_courriel('EQ1', 'Clinique des Lilas SAS', 'technique@lilas.test', 10);
  v_chaud := tests.c4_equipement(v_c, 'CH-2210', 'Chaudière gaz', 5, 'commerciale', 'Bâtiment A');
  v_jour := tests.c4_equipement(v_c, 'CL-0001', 'Climatiseur', 0, 'commerciale', 'Bâtiment A');
  v_loin := tests.c4_equipement(v_c, 'CL-0002', 'Climatiseur', 20, 'commerciale', 'Bâtiment B');
  v_regl := tests.c4_equipement(v_c, 'EX-0009', 'Extincteurs', 4, 'reglementaire', 'Bâtiment B');

  r := private.offload_echeances_cycle(v_client, null);
  h := tests.c4_echeance(v_chaud);
  return next ok(h.id is not null and h.due_le = current_date + 5, 'L''entretien de l''équipement est suivi jusqu''à son échéance');
  return next is(h.base_le, ((current_date + 5) - interval '12 months')::date, 'L''échéance est datée à partir de la dernière intervention enregistrée');
  return next is(h.statut, 'a_valider', 'À cinq jours, le message de la semaine qui précède est préparé, en validation');
  select * into e from public.envois x where x.id = h.envoi_id;
  return next ok(e.objet_type = 'offload_echeances' and e.mode = 'essai'
                 and e.corps like '%L''entretien (entretien annuel) de votre Chaudière gaz (n° CH-2210), site Bâtiment A arrive à échéance le %'
                 and e.corps like '%la dernière intervention enregistrée date du %',
                 'Le message dit l''équipement, le site, l''échéance et la dernière intervention : ' || coalesce(left(e.corps, 200), ''));
  return next ok(exists (select 1 from public.demandes_validation d where d.id = e.demande_id and d.statut = 'en_attente'), 'Rien ne part sans validation');
  return next is((tests.c4_echeance(v_jour)).statut, 'a_venir', 'Le jour même de l''échéance, aucun message : on prévient la semaine d''avant, pas le jour J');
  return next is((tests.c4_echeance(v_loin)).statut, 'a_venir', 'À vingt jours, l''échéance attend sa semaine');
  return next ok((select x.corps like '%Le contrôle réglementaire (entretien annuel) de votre Extincteurs%Ce contrôle est obligatoire.%'
                  from public.envois x where x.id = (tests.c4_echeance(v_regl)).envoi_id),
                 'Une échéance réglementaire est dite comme telle, distincte d''une échéance commerciale');
  return next ok((tests.c4_echeance(v_regl)).nature = 'reglementaire' and (tests.c4_echeance(v_chaud)).nature = 'commerciale',
                 'La nature réglementaire ou commerciale est portée par chaque échéance');

  -- Le lendemain, l'échéance du jour est tombée sans intervention : en attente, sans seconde relance.
  perform private.offload_echeances_cycle(v_client, current_date + 1);
  perform private.offload_echeances_cycle(v_client, current_date + 2);
  h := tests.c4_echeance(v_jour);
  return next ok(h.statut = 'depassee' and h.envoi_id is null and h.motif like '%sans seconde relance%',
                 'Tombée sans intervention connue : en attente, jamais relancée une seconde fois');

  -- Le client a fait l'entretien ailleurs : la date connue, l'échéance sort du cycle.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_noter_intervention(v_chaud, current_date - 1, 'entretien', true, null);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.offload_echeances x where x.equipement_id = v_chaud and x.due_le = current_date + 5
                         and x.statut = 'honoree_ailleurs' and x.motif like 'Intervention faite ailleurs le %'),
                 'Une échéance honorée ailleurs sort du cycle dès que la date est connue');
  return next is((tests.c4_echeance(v_chaud)).due_le, ((current_date - 1) + interval '12 months')::date,
                 'La suivante est datée depuis cette intervention');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.echeances'),
                 'Chaque passage laisse son bilan au journal');
end $f$;

create or replace function tests.test_c4_07_contrats_et_parc() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_c uuid; v_k1 uuid; v_k2 uuid;
  p jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_c := tests.c4_compte_courriel('CT1', 'Froid Ouest SARL', 'contrats@froid.test', 10);
  perform tests.c4_equipement(v_c, 'GF-1', 'Groupe froid', 40, 'reglementaire', 'Entrepôt Nord');
  perform tests.c4_equipement(v_c, 'GF-2', 'Groupe froid', 90, 'commerciale', 'Entrepôt Sud');
  perform tests.c4_equipement(v_c, 'GF-3', 'Groupe froid', 120, 'commerciale', 'Entrepôt Sud');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v_k1 := public.offload_saisir_contrat(v_c, 'CTR-2025-01', current_date + 30, '{"libelle": "Maintenance préventive", "reconduction": "expresse", "equipement_ref": "GF-1"}');
  v_k2 := public.offload_saisir_contrat(v_c, 'CTR-2025-02', current_date + 30, '{"reconduction": "tacite", "equipement_ref": "GF-2"}');
  return next throws_ok(format('select public.offload_saisir_contrat(%L::uuid, %L, current_date, %L::jsonb)', v_c, 'X', '{"prix": 1}'),
                        '22023', null, 'Un champ de contrat inconnu est refusé');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.offload_echeances h where h.contrat_id = v_k1 and h.s_eteint and h.motif like 'Le contrat CTR-2025-01 s''éteint le %'),
                 'Un contrat d''entretien qui s''éteint faute de reconduction est signalé');
  return next ok(not exists (select 1 from public.offload_echeances h where h.contrat_id = v_k2 and h.s_eteint),
                 'Un contrat en tacite reconduction ne l''est pas');
  return next ok(exists (select 1 from public.offload_taches t where t.compte_id = v_c and t.type = 'appel' and t.titre like 'Proposer le renouvellement du contrat CTR-2025-01%'),
                 'Le commercial reçoit la tâche de proposer le renouvellement');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.contrat_s_eteint'), 'Au journal');
  return next ok((select k.equipement_id is not null from public.offload_contrats k where k.id = v_k1), 'Le contrat est rattaché à son équipement');

  p := public.offload_parc(v_client);
  return next ok((p -> 'consolide' ->> 'equipements')::integer >= 3 and (p -> 'consolide' ->> 'reglementaires')::integer >= 1,
                 'Le parc se lit en consolidé (équipements, réglementaires)');
  return next ok(exists (select 1 from jsonb_array_elements(p -> 'sites') s where s ->> 'compte_id' = v_c::text and s ->> 'site' = 'Entrepôt Sud'
                         and (s ->> 'equipements')::integer = 2)
                 and exists (select 1 from jsonb_array_elements(p -> 'sites') s where s ->> 'compte_id' = v_c::text and s ->> 'site' = 'Entrepôt Nord'),
                 'Et site par site');
  return next ok((p -> 'consolide' ->> 'contrats_s_eteignent')::integer >= 1, 'Le consolidé compte les contrats qui s''éteignent');
  return next ok(jsonb_array_length(public.offload_parc_compte(v_c) -> 'equipements') = 3
                 and jsonb_array_length(public.offload_parc_compte(v_c) -> 'contrats') = 2, 'La fiche du compte montre son parc et ses contrats');
end $f$;

create or replace function tests.test_c4_07_import_et_groupe() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_eq uuid; v_g1 uuid; v_g2 uuid; n integer;
begin
  perform tests.c4_reprises_pretes();
  perform tests.c4_deposer('clients', jsonb_build_array(jsonb_build_object('compte_ref', 'P100', 'nom', 'Syndic Horizon')), 'eq-clients');
  perform tests.c4_deposer('equipements', jsonb_build_array(
    jsonb_build_object('compte_ref', 'P100', 'ref', 'ASC-77', 'designation', 'Ascenseur', 'site', 'Résidence Horizon',
                       'periodicite_mois', 'semestriel', 'nature', 'Réglementaire', 'derniere_intervention', to_char(current_date - 100, 'DD/MM/YYYY')),
    jsonb_build_object('compte_ref', 'P101', 'ref', 'PG-1', 'designation', 'Porte de garage', 'periodicite_mois', '12')), 'eq-1');
  select q.id into v_eq from public.offload_equipements q join public.offload_comptes c on c.id = q.compte_id
  where c.client_id = v_client and c.ref = 'P100' and q.ref = 'ASC-77';
  return next ok(v_eq is not null, 'Les équipements installés sont rattachés au compte qui les exploite (import du parc)');
  return next ok((select q.periodicite_mois = 6 and q.nature = 'reglementaire' from public.offload_equipements q where q.id = v_eq),
                 '« semestriel » est lu 6 mois, « Réglementaire » est lu réglementaire');
  return next ok(exists (select 1 from public.offload_comptes c where c.client_id = v_client and c.ref = 'P101'), 'Un compte cité et inconnu est créé');
  perform tests.c4_deposer('interventions', jsonb_build_array(
    jsonb_build_object('equipement_ref', 'ASC-77', 'date', to_char(current_date - 3, 'DD/MM/YYYY'), 'nature', 'Contrôle', 'reference', 'BI-551'),
    jsonb_build_object('equipement_ref', 'INCONNU', 'date', to_char(current_date - 3, 'DD/MM/YYYY'))), 'int-1');
  return next ok(exists (select 1 from public.offload_interventions i where i.equipement_id = v_eq and i.le = current_date - 3 and i.nature = 'controle'),
                 'L''intervention importée se rattache à son équipement par le n° de série');
  return next ok(exists (select 1 from public.offload_echeances h where h.equipement_id = v_eq and h.statut = 'a_venir'
                         and h.due_le = ((current_date - 3) + interval '6 months')::date),
                 'Après l''import, l''échéance est recalculée depuis la dernière intervention');

  -- Deux entités d'un même groupe ont chacune leur échéance ; le plafond, lui, vaut pour le groupe.
  v_g1 := tests.c4_compte_courriel('GR1', 'Dubreuil Nord SAS', 'nord@dubreuil.test', 10);
  v_g2 := tests.c4_compte_courriel('GR2', 'Dubreuil Sud SAS', 'sud@dubreuil.test', 10);
  update public.offload_comptes set groupe = 'Groupe Dubreuil' where id in (v_g1, v_g2);
  perform tests.c4_equipement(v_g1, 'DN-1', 'Compresseur', 3);
  perform tests.c4_equipement(v_g2, 'DS-1', 'Compresseur', 4);
  perform private.offload_echeances_cycle(v_client, null);
  select count(*) into n from public.offload_echeances h where h.compte_id in (v_g1, v_g2) and h.type = 'entretien';
  return next is(n, 2, 'Chaque entité garde son échéance');
  select count(*) into n from public.offload_echeances h where h.compte_id in (v_g1, v_g2) and h.envoi_id is not null;
  return next is(n, 1, 'Un seul message pour le groupe cette semaine');
end $f$;

select * from runtests('tests'::name, '^test_c4_07_');
