-- c4_06 — OFFLOAD : le consentement d'un client existant tombe dans les sources du socle (session C4, 06/10/2026).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_06. runtests() annule tout.

create or replace function tests.test_c4_06_consentement_source() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_pro uuid; v_part uuid; v_neuf uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_pro := tests.c4_compte_courriel('K61', 'Menuiserie Arnaud SAS', 'achats@arnaud-sas.test', 70, false);
  v_part := tests.c4_compte_courriel('K62', 'Jeanne Moreau', 'jeanne@moreau.test', 70, false);
  perform tests.redevenir_admin();
  v_neuf := public.offload_saisir_compte(v_client, null, 'K63', 'Prospect Neuf', '{"email": "prospect@k63.test"}');

  return next lives_ok(format('select private.offload_assurer_consentement(%L::uuid)', v_pro),
                       'Le socle accepte le consentement noté pour une personne morale (plus de consentements_source_check)');
  return next ok(exists (select 1 from public.consentements k where k.client_id = v_client and k.adresse = 'achats@arnaud-sas.test'
                         and k.source = 'contrat' and k.portee = 'tout' and k.retire_le is null
                         and k.preuve = 'intérêt légitime B2B, client existant, message en rapport avec son activité (CNIL)'),
                 'Personne morale : source « contrat », preuve « intérêt légitime B2B… (CNIL) »');
  return next is(private.offload_assurer_consentement(v_part), 'soft_opt_in', 'Particulier qui a déjà acheté : base « soft opt-in »');
  return next ok(exists (select 1 from public.consentements k where k.client_id = v_client and k.adresse = 'jeanne@moreau.test'
                         and k.source = 'contrat' and k.preuve = 'soft opt-in, client existant, produits analogues (CPCE L34-5)'),
                 'Source « contrat », preuve « soft opt-in… (CPCE L34-5) »');
  return next is(private.offload_assurer_consentement(v_neuf), null::text, 'Toujours rien pour un contact sans achat');

  -- Le parcours entier : la nuit ouvre la reprise, le message part en validation (plus de CONSENTEMENT_ABSENT).
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_part);
  return next is(r.statut, 'a_valider', 'Le message du client existant va en validation');
end $f$;

select * from runtests('tests'::name, '^test_c4_06_');
