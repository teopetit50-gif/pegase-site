-- 56 — lot 19ai : compteurs de facturation par client et par mois (pièces lues, part reprise par un opérateur)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ai.
-- runtests() annule tout ce que le test écrit (pièces du client fictif A, compteurs).
-- Les pièces sont posées par tests.inserer_minimal (sha256 tiré au hasard : pieces_une_fois ne doit pas buter sur une
-- ligne existante ; rattachées à un objet d'essai : pieces_rattachee_avant_lecture l'exige avant « lue »), puis leur
-- statut suit le parcours du lecteur.

create or replace function tests.test_56_compteurs_facturation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; user_a uuid; user_b uuid;
  p1 text; p2 text; p3 text; v_lues bigint; v_reprises bigint; v_part numeric; n bigint;
  v_mois date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
begin
  if to_regclass('public.facturation_mesures') is null then
    return next ok(true, 'lot 19ai absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  user_a := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Droits ──
  return next ok(not has_table_privilege('anon', 'public.facturation_mesures', 'select'), 'anon ne lit pas les compteurs');
  return next ok(not has_table_privilege('authenticated', 'public.facturation_mesures', 'insert')
                 and not has_table_privilege('authenticated', 'public.facturation_mesures', 'update'),
                 'authenticated n''écrit pas les compteurs');
  return next ok(not has_table_privilege('authenticated', 'private.mesures_pieces', 'select'), 'authenticated ne lit pas private.mesures_pieces');
  return next ok(not has_function_privilege('authenticated', 'private.facturation_compter_piece()', 'execute'),
                 'authenticated n''exécute pas le compteur');

  -- ── Parcours de lecture ──
  p1 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
                                    'objet_type', 'essai', 'objet_id', gen_random_uuid()::text)) ->> 'id');
  p2 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
                                    'objet_type', 'essai', 'objet_id', gen_random_uuid()::text)) ->> 'id');
  p3 := (tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
                                    'objet_type', 'essai', 'objet_id', gen_random_uuid()::text)) ->> 'id');
  select count(*) into n from public.facturation_mesures where client_id = client_a and mois = v_mois;
  return next is(n, 0::bigint, 'une pièce reçue ne compte pas');

  update public.pieces set statut = 'lue' where id::text = p1;          -- lue d'emblée
  update public.pieces set statut = 'a_verifier' where id::text = p2;   -- reprise par un opérateur
  update public.pieces set statut = 'lue' where id::text = p2;          -- validée ensuite : ne recompte pas
  update public.pieces set statut = 'echec' where id::text = p3;        -- rien de lu : rien de facturé
  update public.pieces set statut = 'lue' where id::text = p1;          -- relue : ne recompte pas

  select pieces_lues, pieces_reprises, part_reprise into v_lues, v_reprises, v_part
  from public.facturation_mois where client_id = client_a and mois = v_mois;
  return next is(v_lues, 2::bigint, 'deux pièces lues (la relue et l''échec ne comptent pas)');
  return next is(v_reprises, 1::bigint, 'une pièce reprise par un opérateur');
  return next is(v_part, 0.5000::numeric, 'part reprise : 0,5');

  -- ── Cloisonnement ──
  perform tests.endosser(user_a);
  select count(*) into n from public.facturation_mois where client_id = client_a;
  return next ok(n >= 1, 'le client A lit ses compteurs');
  perform tests.redevenir_admin();
  perform tests.endosser(user_b);
  select count(*) into n from public.facturation_mois where client_id = client_a;
  return next is(n, 0::bigint, 'le client B ne lit pas ceux de A');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_56_');
