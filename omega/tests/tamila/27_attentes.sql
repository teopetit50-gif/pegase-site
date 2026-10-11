-- 27 — Les pièces attendues du client, du confrère ou d'un tiers (migration b4_18). Après 00_jeu_tamila.sql,
-- b4_01 à b4_18. runtests() annule tout.

create or replace function tests.test_b4_27_attentes() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_a uuid; v_b uuid; x public.tamila_attentes; n bigint; v_txt text;
  v_jour date := (now() at time zone 'Europe/Paris')::date; v_m timestamptz;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_m := (v_jour + time '08:00') at time zone 'Europe/Paris';

  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_attente(%L::uuid, ''client'', tests.tamila_chiffre(''x''))', v_dossier), '42501', null, 'le stagiaire ne pose pas d''attente (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_attente(%L::uuid, ''client'', convert_to(''relevés bancaires'', ''UTF8''))', v_dossier), '22023', null, 'un objet en clair est refusé (22023)');
  return next throws_ok(format('select public.tamila_poser_attente(%L::uuid, ''juge'', tests.tamila_chiffre(''x''))', v_dossier), '22023', null, 'de qui : client, confrère ou tiers (22023)');
  return next throws_ok(format('select public.tamila_poser_attente(%L::uuid, ''client'', tests.tamila_chiffre(''x''), %L::date)', v_dossier, v_jour - 1), '22023', null, 'une relance ne se prévoit pas dans le passé (22023)');
  v_a := public.tamila_poser_attente(v_dossier, 'client', tests.tamila_chiffre('Relevés bancaires 2023 ' || tests.tamila_sentinelle()), v_jour);
  v_b := public.tamila_poser_attente(v_dossier, 'confrere', tests.tamila_chiffre('Pièce n° 12 citée'), v_jour + 10);
  perform tests.redevenir_admin();
  select * into x from public.tamila_attentes where id = v_a;
  return next ok(x.statut = 'attendue' and x.de = 'client' and x.relance_le = v_jour, 'l''assistante pose la pièce attendue du client, relance aujourd''hui');
  return next is(tests.tamila_clair_dans('tamila_attentes', tests.tamila_sentinelle())::bigint, 0::bigint, 'l''objet n''est nulle part en clair');

  -- Le point du matin de l'avocat : une relance due aujourd'hui (celle du confrère est dans dix jours).
  perform private.tamila_deposer_points(v_m);
  select string_agg(i.texte, ' | ') into v_txt from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.destinataire = (jeu ->> 'avocat')::uuid;
  return next ok(v_txt like '%1 pièce attendue à relancer (client, confrère ou tiers)%', 'le point : une pièce à relancer');

  -- Relancée, puis reçue.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_noter_attente(%L::uuid, ''relancee'', null, %L::date)', v_a, v_jour), '22023', null, 'la prochaine relance est après aujourd''hui (22023)');
  perform public.tamila_noter_attente(v_a, 'relancee', null, v_jour + 7);
  perform tests.redevenir_admin();
  select * into x from public.tamila_attentes where id = v_a;
  return next ok(x.relances = 1 and x.relance_le = v_jour + 7, 'relancée une fois, prochaine relance dans sept jours');
  perform private.tamila_deposer_points(v_m);
  select count(*) into n from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.destinataire = (jeu ->> 'avocat')::uuid and i.texte like '%à relancer%';
  return next is(n, 0::bigint, 'plus rien à relancer aujourd''hui');
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  perform public.tamila_noter_attente(v_a, 'recue', v_jour);
  return next throws_ok(format('select public.tamila_noter_attente(%L::uuid, ''recue'')', v_a), '55000', null, 'reçue une fois (55000)');
  perform public.tamila_noter_attente(v_b, 'abandon');
  perform tests.redevenir_admin();
  return next ok((select statut = 'recue' and recue_le = v_jour from public.tamila_attentes where id = v_a)
                 and (select statut = 'abandonnee' from public.tamila_attentes where id = v_b), 'reçue, et l''autre abandonnée');

  -- Qui lit.
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  select count(*) into n from public.tamila_attentes where dossier_id = v_dossier;
  return next is(n, 0::bigint, 'un autre cabinet ne voit rien');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_27_');
