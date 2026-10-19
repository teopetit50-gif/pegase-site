-- c3_19 — REPUT : l'export à date fixe (programme, fichier de la période échue, courriel interne sans le fichier).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_18 (aides tests.c3_*, dont tests.c3_15_demande de
-- c3_15) et les migrations c3_01 à c3_19 et le socle 19as. Contacts fictifs. Rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_19_export() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_admin_lyon uuid; v_collab uuid; v_lyon uuid; v_nantes uuid;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
  v_a uuid; v_b uuid; v_c uuid; v_prog uuid; x public.reput_exports; v_n int; e record;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-19-gerant@banc-varelo.test');
  v_admin_lyon := tests.c3_compte(v_client, 'admin', 'c3-19-admin-lyon@banc-varelo.test', false);
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-19-collab@banc-varelo.test');
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lyon (C3-19)', 'site') returning id into v_lyon;
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Nantes (C3-19)', 'site') returning id into v_nantes;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (v_client, v_admin_lyon, v_lyon);
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  v_a := tests.c3_15_demande(v_client, 'email', 'c3-19a@exemple.test', 'Fictif Export A', 'Ouvert samedi ?', now() - interval '2 days');
  v_b := tests.c3_15_demande(v_client, 'whatsapp', '+33600191919', 'Fictif Export Lyon', 'Un devis ?', now() - interval '3 days');
  update public.reput_demandes set entite_id = v_lyon where id = v_b;
  v_c := tests.c3_15_demande(v_client, 'email', 'c3-19c@exemple.test', 'Fictif Export Ancien', 'Bonjour', now() - interval '10 days');

  -- ── Programmer : qui, quoi ──
  return next ok(not has_function_privilege('anon', 'public.reput_programmer_export(uuid, text, integer, uuid, uuid[], boolean)', 'execute'),
                 'anon ne programme pas d''export');
  perform tests.endosser(v_collab, 'c3-19-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_programmer_export(%L, %L, 1)', v_client, 'hebdomadaire'), '42501', null,
                        'Un collaborateur ne programme pas d''export');
  perform tests.endosser(v_admin_lyon, 'c3-19-admin-lyon@banc-varelo.test');
  return next throws_ok(format('select public.reput_programmer_export(%L, %L, 1)', v_client, 'hebdomadaire'), '42501', null,
                        'Un administrateur de site ne programme pas l''export de toute l''organisation');
  perform public.reput_programmer_export(v_client, 'hebdomadaire', extract(isodow from v_auj)::int, v_lyon);
  perform tests.endosser(v_gerant, 'c3-19-gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_programmer_export(%L, %L, 9)', v_client, 'hebdomadaire'), '23514', null,
                        'Un jour de semaine hors 1 à 7 est refusé');
  return next throws_ok(format('select public.reput_programmer_export(%L, %L, 1, null, array[%L]::uuid[])', v_client, 'hebdomadaire', v_collab),
                        '22023', null, 'Un collaborateur n''est pas destinataire d''un export');
  v_prog := (public.reput_programmer_export(v_client, 'hebdomadaire', extract(isodow from v_auj)::int) ->> 'programme')::uuid;
  perform public.reput_programmer_export(v_client, 'mensuel', 3, v_nantes);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from cron.job j where j.jobname = 'reput-exports'), 'La tâche reput-exports est posée');

  -- ── Le jour dit ──
  v_n := private.reput_exports_du_jour(now());
  return next ok(v_n >= 2, 'Le jour dit, les exports de l''organisation et de Lyon sont fabriqués');
  select * into x from public.reput_exports r where r.programme_id = v_prog;
  return next ok(x.periode_du = v_auj - 7 and x.periode_au = v_auj - 1, 'Hebdomadaire : les sept jours précédents');
  return next is(x.lignes, (select count(*)::int from public.reput_demandes d where d.client_id = v_client
                            and (d.recu_le at time zone 'Europe/Paris')::date between v_auj - 7 and v_auj - 1),
                 'Une ligne par demande reçue dans la période');
  return next ok(position('Fictif Export A' in x.contenu) > 0 and position('Fictif Export Ancien' in x.contenu) = 0,
                 'La demande d''il y a dix jours n''y est pas');
  return next ok(left(x.contenu, 1) = chr(65279) and position('Reçue le;Canal;Client;Sujet' in x.contenu) > 0 and position('Agence de Lyon (C3-19)' in x.contenu) > 0,
                 'CSV lisible par un tableur : BOM, séparateur « ; », colonne du site');
  return next ok(x.nom_fichier = 'reput-demandes-' || to_char(v_auj - 7, 'YYYY-MM-DD') || '-au-' || to_char(v_auj - 1, 'YYYY-MM-DD') || '.csv',
                 'Le fichier est daté de sa période');
  select * into x from public.reput_exports r where r.client_id = v_client and r.entite_id = v_lyon;
  return next ok(position('Fictif Export Lyon' in x.contenu) > 0 and position('Fictif Export A' in x.contenu) = 0,
                 'L''export de Lyon ne porte que les demandes de Lyon');
  return next is(private.reput_exports_du_jour(now() + interval '1 hour'), 0, 'Une période n''est fabriquée qu''une fois');
  select * into e from public.envois m where m.client_id = v_client and m.destinataire_membre = v_gerant and m.cle_idempotence like 'reput.export_pret:%';
  return next ok(e.id is not null and e.direct and e.canal = 'email', 'Le gérant est prévenu par courriel interne');
  return next ok(e.corps like '%https://omegaai.fr/espace2/reput%' and e.corps not like '%Fictif%' and e.corps not like '%Reçue le%',
                 'Le courriel mène à l''espace ; il ne porte ni le fichier ni un client');
  return next ok(tests.c3_journal(v_client, 'reput.export_fabrique') is not null, 'Journal : reput.export_fabrique');

  -- ── Mensuel : le mois précédent ──
  perform private.reput_exports_du_jour('2026-11-03 08:00:00+01'::timestamptz);
  return next ok(exists (select 1 from public.reput_exports r where r.client_id = v_client and r.entite_id = v_nantes
                         and r.periode_du = '2026-10-01' and r.periode_au = '2026-10-31'),
                 'Mensuel, le 3 novembre : le mois d''octobre');

  -- ── Qui télécharge ──
  perform tests.endosser(v_collab, 'c3-19-collab@banc-varelo.test');
  return next is(tests.compter('public', 'reput_exports', format('client_id = %L', v_client))::int, 0, 'Un collaborateur ne lit pas les exports');
  perform tests.endosser(v_admin_lyon, 'c3-19-admin-lyon@banc-varelo.test');
  return next ok(tests.compter('public', 'reput_exports', format('client_id = %L and entite_id = %L', v_client, v_lyon)) = 1
                 and tests.compter('public', 'reput_exports', format('client_id = %L and entite_id is null', v_client)) = 0,
                 'Un administrateur de Lyon lit l''export de Lyon, pas celui de l''organisation');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_19_');
