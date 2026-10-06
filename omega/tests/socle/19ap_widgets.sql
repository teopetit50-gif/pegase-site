-- Socle 19ap — la messagerie instantanée du site : droits, réglage par le gérant (origines vérifiées), dépôt en
-- réception (canal formulaire, fil = la conversation), refus (clé, origine, coordonnées), plafonds, idempotence.
-- Client A de tests.jeu(). runtests() annule tout.

create or replace function tests.test_socle_19ap_widgets() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; r jsonb; v_cle text; code text; i integer;
  conv uuid := gen_random_uuid(); msg uuid := gen_random_uuid(); rec public.receptions;
begin
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  return next ok(not has_table_privilege('authenticated', 'public.widgets', 'insert')
                 and not has_table_privilege('authenticated', 'public.widgets', 'update')
                 and not has_table_privilege('authenticated', 'private.widgets_appels', 'select'),
                 'authenticated n''écrit pas les widgets et ne lit pas les appels');
  return next ok(not has_function_privilege('authenticated', 'public.widget_deposer(text, text, text, uuid, uuid, text, text, text, text, text, boolean)', 'execute')
                 and not has_function_privilege('anon', 'public.widget_deposer(text, text, text, uuid, uuid, text, text, text, text, text, boolean)', 'execute'),
                 'widget_deposer : service_role seulement');

  -- ── Réglage ──
  perform tests.endosser(membre, 'a2-user-a@essai.invalid');
  begin perform public.widget_regler(client, 'Site', array['https://www.exemple.fr']); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un collaborateur ne règle pas la messagerie du site (42501)');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  begin perform public.widget_regler(client, 'Site', array['javascript:alert(1)']); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'une origine mal formée est refusée (22023)');
  r := public.widget_regler(client, 'Site vitrine', array['https://www.Exemple.fr/', 'https://exemple.fr']);
  v_cle := r ->> 'cle';
  return next ok(v_cle ~ '^w_[a-z0-9]{32}$', 'clé publique rendue');
  return next is(r -> 'origines', '["https://www.exemple.fr", "https://exemple.fr"]'::jsonb, 'origines nettoyées (minuscules, sans barre finale)');

  -- ── Dépôt ──
  perform tests.endosser_serveur();
  return next is(public.widget_apparence(v_cle) ->> 'libelle', 'Site vitrine', 'apparence lue par la fonction');
  r := public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('a', 64), conv, msg, 'Fuite sous l''évier', 'Élodie',
                             'Elodie@Exemple.fr', null, 'https://www.exemple.fr/contact', true);
  return next is(r ->> 'statut', 'recu', 'message reçu');
  r := public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('a', 64), conv, msg, 'Fuite sous l''évier', 'Élodie',
                             'Elodie@Exemple.fr', null, null, true);
  return next is(r ->> 'deja', 'true', 'le même message rejoué n''est reçu qu''une fois');
  perform tests.redevenir_admin();
  select * into rec from public.receptions x where x.client_id = client and x.identifiant_externe = 'widget:' || msg::text;
  return next is(rec.canal || '/' || rec.boite || '/' || rec.de_adresse, 'formulaire/widget:' || v_cle || '/elodie@exemple.fr',
                 'réception : canal formulaire, boîte du widget, e-mail en minuscules');
  return next is(rec.module || '/' || rec.fil, 'reput/widget:' || conv::text, 'module reput, fil = la conversation');

  -- ── Refus ──
  perform tests.endosser_serveur();
  return next is(public.widget_deposer(v_cle, 'https://evil.test', repeat('a', 64), conv, gen_random_uuid(), 'x', null, 'a@b.fr', null, null, true) ->> 'motif',
                 'origine', 'autre origine : refusé');
  return next is(public.widget_deposer('w_00000000000000000000000000000000', 'https://www.exemple.fr', repeat('a', 64), conv, gen_random_uuid(), 'x', null, 'a@b.fr', null, null, true) ->> 'motif',
                 'cle', 'clé inconnue : refusé');
  return next is(public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('a', 64), conv, gen_random_uuid(), 'x', null, null, null, null, true) ->> 'motif',
                 'coordonnees', 'sans e-mail ni téléphone : refusé (on ne pourrait pas répondre)');
  for i in 1..9 loop
    perform public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('b', 64), conv, gen_random_uuid(), 'm' || i, null, 'a@b.fr', null, null, true);
  end loop;
  return next is(public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('b', 64), conv, gen_random_uuid(), 'm10', null, 'a@b.fr', null, null, true) ->> 'statut',
                 'recu', 'dix messages en dix minutes depuis une même adresse : acceptés');
  return next is(public.widget_deposer(v_cle, 'https://www.exemple.fr', repeat('b', 64), conv, gen_random_uuid(), 'm11', null, 'a@b.fr', null, null, true) ->> 'motif',
                 'plafond', 'le onzième : plafond');

  -- ── Désactivé ──
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  perform public.widget_regler(client, null, array['https://www.exemple.fr'],
                               (select id from public.widgets where cle = v_cle), null, null, false);
  perform tests.endosser_serveur();
  return next ok(public.widget_apparence(v_cle) is null, 'désactivé : le script ne s''affiche plus');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_socle_19ap_');
