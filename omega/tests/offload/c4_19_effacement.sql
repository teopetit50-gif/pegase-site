-- c4_19 — OFFLOAD : l'effacement des données d'une personne (session C4, 19/10/2026). Après c4_00, c4_03 (aides) et
-- les migrations c4_01 à c4_19. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_19_effacement() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid;
  v_collab uuid;
  v_envoi uuid;
  v_achats integer;
  r jsonb;
  c public.offload_comptes;
begin
  -- L'effacement de l'organisation (socle) emporte toutes les tables d'OFFLOAD.
  return next ok(not exists (
                   select 1 from pg_class t join pg_namespace n on n.oid = t.relnamespace
                   where n.nspname = 'public' and t.relkind = 'r' and t.relname like 'offload\_%'
                     and not exists (select 1 from pg_constraint k where k.conrelid = t.oid and k.contype = 'f'
                                       and k.confrelid = 'public.clients'::regclass and k.confdeltype = 'c')),
                 'Chaque table d''OFFLOAD part avec son organisation (client_id … on delete cascade)');

  perform tests.c4_reprises_pretes();
  v_x := tests.c4_compte_courriel('EF1', 'Jean Durand EI', 'jean.durand@durand-ei.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  v_envoi := (tests.c4_reprise(v_x)).envoi1_id;
  select count(*) into v_achats from public.offload_achats where compte_id = v_x;

  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-effacement@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-effacement@banc-varelo.test');
  return next throws_ok(format('select public.offload_effacer_compte(%L::uuid, %L)', v_x, 'courrier'), '42501', null,
                        'Un collaborateur n''efface pas les données d''une personne');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_effacer_compte(%L::uuid, %L)', v_x, ' '), '22023', null,
                        'L''origine de la demande est obligatoire');
  r := public.offload_effacer_compte(v_x, 'Courriel de M. Durand du 19/10');
  perform tests.redevenir_admin();

  select * into c from public.offload_comptes where id = v_x;
  return next ok(c.contact is null and c.email is null and c.telephone is null and c.ville is null
                 and c.nom like 'Compte effacé%' and c.statut = 'arrete' and c.efface_le is not null,
                 'Nom, interlocuteur, courriel, téléphone et ville sont effacés ; le compte sort du cycle');
  return next ok((select count(*)::int from public.offload_achats where compte_id = v_x) = v_achats and v_achats > 0,
                 'L''historique d''achats (chiffres sans nom) est gardé');
  return next ok(v_envoi is null or (select e.statut from public.envois e where e.id = v_envoi) not in ('a_valider', 'pret'),
                 'Le message qui attendait est annulé (' || coalesce((select e.statut from public.envois e where e.id = v_envoi), 'aucun') || ')');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.compte_efface'
                         and j.objet_id = v_x::text and position('durand-ei' in j.donnees::text) = 0),
                 'L''effacement est au journal, sans les données effacées');

  -- Une nouvelle saisie de la même référence ne réécrit rien.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_saisir_compte(v_client, null, 'EF1', 'Jean Durand EI',
    jsonb_build_object('email', 'jean.durand@durand-ei.test', 'contact', 'Jean', 'telephone', '06 00 00 00 01'));
  r := public.offload_effacer_compte(v_x, 'Second courrier');
  perform tests.redevenir_admin();
  select * into c from public.offload_comptes where id = v_x;
  return next ok(c.email is null and c.contact is null and c.telephone is null and c.nom like 'Compte effacé%' and c.statut = 'arrete',
                 'Ressaisi, le compte effacé reste effacé');
  return next ok((r ->> 'deja')::boolean, 'Effacer deux fois ne fait rien de plus');
  return next ok(not has_function_privilege('anon', 'public.offload_effacer_compte(uuid, text)', 'execute'),
                 'anon n''efface rien');
end $f$;

select * from runtests('tests'::name, '^test_c4_19_');
