-- 18 — L'en-tête de facture du cabinet (migration b4_09). Après 00_jeu_tamila.sql, b4_01 à b4_09. runtests() annule tout.

create or replace function tests.test_b4_18_facture_entete() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; r jsonb;
  v_ok jsonb := '{"nom": "Delorme & Associés", "forme": "SELARL", "adresse": "12 rue de la Paix", "code_postal_ville": "75002 Paris",
                  "siren": "552100554", "tva_intracom": "FR40552100554", "barreau": "Paris", "toque": "P 0123",
                  "iban": "FR76 3000 6000 0112 3456 7890 189", "delai_paiement_jours": 30, "courriel": "cabinet@delorme.invalid"}';
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;

  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, %L::jsonb)', v_client, v_ok), '42501', null,
                        'un associé non gérant ne pose pas l''en-tête (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, ''{"nom": "X", "secret": "y"}''::jsonb)', v_client), '22023', null,
                        'une clé inconnue est refusée (22023)');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, ''{"siren": "12345"}''::jsonb)', v_client), '22023', null,
                        'un SIREN de 5 chiffres est refusé (22023)');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, ''{"tva_intracom": "DE123"}''::jsonb)', v_client), '22023', null,
                        'un numéro de TVA illisible est refusé (22023)');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, ''{"delai_paiement_jours": 90}''::jsonb)', v_client), '22023', null,
                        'un délai de paiement de 90 jours est refusé (C. com. L.441-10) (22023)');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, ''{"iban": "pas un iban"}''::jsonb)', v_client), '22023', null,
                        'un IBAN illisible est refusé (22023)');
  r := public.tamila_poser_entete_facture(v_client, v_ok);
  return next is(r ->> 'siren', '552100554', 'le gérant pose l''en-tête');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is((select facture_entete ->> 'toque' from public.tamila_reglages where client_id = v_client), 'P 0123',
                 'tout membre du cabinet le lit (pour composer une facture)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is((select count(*) from public.tamila_reglages where client_id = v_client), 0::bigint, 'pas le cabinet voisin');
  return next throws_ok(format('select public.tamila_poser_entete_facture(%L::uuid, %L::jsonb)', v_client, v_ok), '42501', null,
                        'qui ne peut pas non plus le poser (42501)');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.facture.entete'),
                 'le changement d''en-tête est au journal');
end $f$;

select * from runtests('tests'::name, '^test_b4_18_');
