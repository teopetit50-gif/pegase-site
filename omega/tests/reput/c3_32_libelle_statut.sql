-- c3_32 — REPUT, correctif TREPUT-08 (R7a) : jamais le statut brut « ignoree » dans l'export ; une demande regroupée dit avec
-- laquelle. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_31 (aides tests.c3_*, dont tests.c3_15_demande
-- de c3_15) et les migrations c3_01 à c3_32. runtests() annule tout.

create or replace function tests.test_c3_32_libelle_statut() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_a uuid; v_b uuid; v_prog uuid; v_exp uuid; x public.reput_exports;
  q text := 'Bonjour, avez-vous des disponibilités pour poser une cuisine en novembre ?';
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-32-gerant@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  v_a := tests.c3_15_demande(v_client, 'email', 'c3-32-nora@exemple.test', 'Fictive Céleste', q, '2026-10-20 14:05:00 Europe/Paris'::timestamptz);
  perform public.reput_deposer_reponse(v_a, jsonb_build_object('sujet', 'rendez_vous', 'langue', 'fr', 'couverte', false, 'corps', 'Nous regardons.'));
  v_b := (public.reput_commencer(tests.c3_reception(v_client, 'formulaire', 'c3-32-nora@exemple.test', 'Fictive Céleste', 'Formulaire du site', q)) ->> 'demande')::uuid;
  update public.reput_demandes set recu_le = '2026-10-20 14:30:00 Europe/Paris'::timestamptz where id = v_b;

  return next is(private.reput_libelle_statut(v_b), 'Regroupée avec la demande du 20/10/2026 14:05 (courriel, Fictive Céleste)',
                 'Une demande regroupée dit avec laquelle, à l''heure du site');
  return next is(private.reput_libelle_statut(v_a), 'Réponse à valider', 'La demande gardée : un libellé lisible');

  perform tests.endosser(v_gerant, 'c3-32-gerant@banc-varelo.test');
  v_prog := (public.reput_programmer_export(v_client, 'mensuel', 1) ->> 'programme')::uuid;
  perform tests.redevenir_admin();
  v_exp := private.reput_fabriquer_export(v_prog, '2026-10-01', '2026-10-31');
  select * into x from public.reput_exports r where r.id = v_exp;
  return next ok(position(';ignoree;' in x.contenu) = 0 and position(';a_valider;' in x.contenu) = 0, 'L''export ne porte plus de code brut');
  return next ok(position('Regroupée avec la demande du 20/10/2026 14:05' in x.contenu) > 0, 'L''export dit « Regroupée avec la demande du … »');
end $f$;

select * from runtests('tests'::name, '^test_c3_32_');
