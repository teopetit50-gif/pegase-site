-- B3-23 — Les règles de priorité communes (b3_22), sur deux centres : le centre du banc (A) et « Centre B3-23 Le
-- Gosier » (B), créé ici comme site rattaché à A, dont le gérant est aussi titulaire. Après 00, 00b, b3_01 à b3_22.
-- runtests() annule tout.

create or replace function tests.test_b3_23_regles_communes() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  x jsonb;
  v_fuseau text;
  v_b uuid;
  n integer;
  ga public.tiroma_regles;
  gb public.tiroma_regles;
begin
  r := tests.b3_cabinet_releve('initial');
  perform tests.redevenir_admin();
  select en.fuseau into v_fuseau from public.entites en where en.id = entite;
  insert into public.entites (client_id, parent_id, nom, type, fuseau) values (banc, entite, 'Centre B3-23 Le Gosier', 'site', v_fuseau) returning id into v_b;
  perform tests.b3_endosser('gerant');
  perform public.tiroma_installer_cabinet(banc, v_b, 'logosw', 'cabinet', null);
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('gerant'), v_b, 'titulaire');

  -- A s'écarte des valeurs d'origine ; chaque centre a son objectif de production et ses garde-fous.
  update public.tiroma_regles set ordre_priorite = array['attente', 'plan', 'controle'], nb_propositions = 5, seuil_demi_journee_vide = 0.300,
         objectif_production_semaine = 9000, garde_min_rdv_jour = 7
   where client_id = banc and entite_id = entite;
  update public.tiroma_regles set objectif_production_semaine = 4000, garde_min_rdv_jour = 12 where client_id = banc and entite_id = v_b;

  x := public.tiroma_regles_communes(banc);
  return next is(jsonb_array_length(x -> 'centres'), 2, 'le titulaire voit les règles de ses deux centres');
  return next ok((x -> 'ecarts') ? 'ordre_priorite' and (x -> 'ecarts') ? 'nb_propositions' and (x -> 'ecarts') ? 'seuil_demi_journee_vide',
                 format('les écarts sont nommés : %s', x -> 'ecarts'));
  return next ok(not (x -> 'ecarts') ? 'objectif_production_semaine' and not (x -> 'ecarts') ? 'garde_min_rdv_jour',
                 'l''objectif de production et les garde-fous ne sont pas des règles de priorité');

  -- Qui aligne.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_aligner_regles(%L, %L)', banc, entite), '42501', null, 'l''assistante n''aligne rien (42501)');
  perform tests.b3_endosser('daf');
  return next throws_ok(format('select public.tiroma_aligner_regles(%L, %L)', banc, entite), '42501', null, 'le collaborateur non plus (42501)');
  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_aligner_regles(%L, %L, array[%L, %L]::uuid[])', banc, entite, v_b, gen_random_uuid()),
                        '42501', null, 'une cible dont il n''est pas titulaire : refus, et rien n''est changé (42501)');
  return next ok((select g.nb_propositions <> 5 from public.tiroma_regles g where g.client_id = banc and g.entite_id = v_b),
                 'après le refus, B n''a pas bougé');

  -- Aligner B sur A.
  n := public.tiroma_aligner_regles(banc, entite);
  return next is(n, 1, 'un centre aligné (B), la source n''est pas comptée');
  perform tests.redevenir_admin();   -- private.tiroma_regles_de_priorite n'est ouverte qu'au service
  select * into ga from public.tiroma_regles where client_id = banc and entite_id = entite;
  select * into gb from public.tiroma_regles where client_id = banc and entite_id = v_b;
  return next ok(private.tiroma_regles_de_priorite(ga) = private.tiroma_regles_de_priorite(gb), 'B a les règles de priorité de A');
  return next ok(gb.ordre_priorite = array['attente', 'plan', 'controle'] and gb.nb_propositions = 5, 'dont l''ordre « liste d''attente d''abord » et 5 propositions');
  return next ok(gb.objectif_production_semaine = 4000 and gb.garde_min_rdv_jour = 12, 'B garde son objectif de production et ses garde-fous');
  perform tests.b3_endosser('gerant');
  x := public.tiroma_regles_communes(banc);
  return next is(jsonb_array_length(x -> 'ecarts'), 0, 'plus aucun écart');
  return next is(public.tiroma_aligner_regles(banc, entite, array[entite]::uuid[]), 0, 'la source seule en cible : rien à aligner');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.regles_alignees'), 'journal : « tiroma.regles_alignees »');

  -- daf2, sans profil : ne lit rien d'autre qu'une liste vide.
  perform tests.b3_endosser('daf2');
  x := public.tiroma_regles_communes(banc);
  return next is(jsonb_array_length(x -> 'centres'), 0, 'daf2, titulaire de rien, ne voit aucune règle');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_23_');
