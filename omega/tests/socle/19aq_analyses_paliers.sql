-- Socle 19aq — le garde-fou des paliers suit la taille du dossier : 50 au moins, deux par pièce au-delà.
-- Après 19an et son test (banc cccccccc-…000c). runtests() annule tout.

create or replace function tests.test_socle_19aq_analyses_paliers() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_piece uuid;
  v_petite uuid;
  v_grande uuid;
  r jsonb;
begin
  perform tests.redevenir_admin();
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), banc, 'filed', 'depot', 'paliers-19aq.pdf', 'application/pdf', 1024, repeat('8', 64),
          banc::text || '/filed_document/test/paliers-19aq.pdf', 'filed_document', 'socle19aq', 'lue')
  returning id into v_piece;
  v_petite := private.demander_analyse(banc, 'filed', 'filed_document', 'socle19aq', 'filed.essai', array[v_piece]);
  v_grande := private.demander_analyse(banc, 'filed', 'filed_document', 'socle19aq', 'filed.essai', array_fill(v_piece, array[40]));

  -- Dossier d'une pièce : le plancher de 50 tient.
  update public.analyses set statut = 'en_cours', paliers = 50 where id = v_petite;
  perform tests.endosser_serveur();
  r := public.terminer_analyse(v_petite, '{"statut": "en_cours", "etat": {}}'::jsonb, 'analyse/essai');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'echec', 'une pièce : arrêt au 50e palier');
  return next is((select motif from public.analyses where id = v_petite), 'Trop de paliers (50) : l''analyse est arrêtée.', 'motif à 50');

  -- Dossier de 40 pièces : 80 paliers permis ; le 55e passe, le 80e arrête.
  update public.analyses set statut = 'en_cours', paliers = 55 where id = v_grande;
  perform tests.endosser_serveur();
  r := public.terminer_analyse(v_grande, '{"statut": "en_cours", "etat": {}}'::jsonb, 'analyse/essai');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'en_cours', '40 pièces : le 55e palier continue');
  return next is((select paliers from public.analyses where id = v_grande), 56, 'palier suivant');
  update public.analyses set paliers = 80 where id = v_grande;
  perform tests.endosser_serveur();
  r := public.terminer_analyse(v_grande, '{"statut": "en_cours", "etat": {}}'::jsonb, 'analyse/essai');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'echec', '40 pièces : arrêt au 80e palier');
  return next ok(has_function_privilege('service_role', 'private.terminer_analyse(uuid, jsonb, text)', 'execute')
                 and not has_function_privilege('authenticated', 'private.terminer_analyse(uuid, jsonb, text)', 'execute'),
                 'droits inchangés : service_role seul');
end $f$;

select * from runtests('tests'::name, '^test_socle_19aq_');
