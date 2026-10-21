-- c3_26 — REPUT, correctif TREPUT-01 (R10) : « Envoyé de mon iPhone » seul = sans texte (sans modèle) ; jamais de civilité
-- qu'on n'a pas reçue. Reproduit les deux cas de la série 1. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00
-- à c3_25 (aides tests.c3_*, dont tests.c3_20_reception de c3_20 et tests.c3_15_demande de c3_15) et les migrations c3_01 à
-- c3_26. runtests() annule tout.

create or replace function tests.test_c3_26_sans_texte_civilite() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_rec bigint; v_j jsonb; v_dem uuid; p public.reput_reponses;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── R10 (Vitalis) : « Envoyé de mon iPhone », sans pièce ──
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-26a@exemple.test', null, E'\n\nEnvoyé de mon iPhone', 0);
  v_j := public.reput_commencer(v_rec);
  return next is(v_j ->> 'statut', 'preparee', 'Une signature d''appareil seule, sans pièce : préparée dans la base, sans modèle');
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(p.corps like '%Il nous est parvenu sans texte%' and p.modele = 'regle:sans_texte' and p.cout_eur = 0,
                 'La précision demandée est celle d''un message vide ; coût nul');
  return next ok(p.raison like 'Message sans texte (rien qu''une signature d''appareil%', 'La raison le dit');
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-26b@exemple.test', 'IMG_1.jpg', null, 1);
  v_j := public.reput_commencer(v_rec);
  return next ok((select x.corps like '%Nous avons bien reçu votre pièce jointe%' from public.reput_reponses x
                  where x.id = (v_j ->> 'reponse')::uuid),
                 'Une pièce seule garde la précision « pièce » (c3_20)');

  -- ── R10 : jamais de civilité qu'on n'a pas reçue ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-26c@exemple.test', 'Claire Vitalis', 'Bonjour, êtes-vous ouverts samedi ? Claire');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'corps', E'Madame Vitalis, nous vérifions nos horaires du samedi et revenons vers vous. Merci Madame Vitalis.'));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(position('Madame' in p.corps) = 0 and position('Madame' in p.brouillon) = 0,
                 'R10 : la civilité déduite du prénom est ôtée du corps et du brouillon');
  return next ok(p.brouillon like 'Nous vérifions nos horaires du samedi%' and p.corps like '%Merci Vitalis.%',
                 'La phrase reprend avec une majuscule ; ailleurs, le nom reste sans civilité');
  return next is((select d.payload ->> 'corps' from public.demandes_validation d where d.id = (v_j ->> 'demande_validation')::uuid), p.corps,
                 'La file de validation porte le même texte');
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-26d@exemple.test', 'Mme Claire Vitalis', 'Bonjour, êtes-vous ouverts samedi ?');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'corps', 'Madame Vitalis, nous vérifions et revenons vers vous.'));
  return next ok((select x.corps like '%Madame Vitalis, nous vérifions%' from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid),
                 'Une civilité que la cliente a écrite elle-même reste');
  return next is(private.reput_sans_civilite(E'Bonjour Monsieur Miller,\n\nThanks Mr. Miller.', false), E'Bonjour,\n\nThanks Miller.',
                 '« Bonjour Monsieur Miller, » → « Bonjour, » ; « Mr. Miller » → « Miller »');
end $f$;

select * from runtests('tests'::name, '^test_c3_26_');
