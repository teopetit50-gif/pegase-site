-- 66 — lot 19ax : délégations — refus en français (TFILED-09), jours pris dans le fuseau de l'organisation (TFILED-10).
-- Rouge avant 19ax (messages techniques ; « jusqu'au 29/10 » s'éteint à minuit UTC), vert après.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ax.
-- runtests() annule tout ce que le test écrit (client fictif A, fuseau de son entité, délégations).

create or replace function tests.test_66_delegations_francais_fuseau() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; v_fin timestamptz; v_debut timestamptz; code text; msg text;
begin
  if to_regclass('public.delegations') is null or to_regclass('public.entites') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'delegations' and column_name = 'delegant') then
    return next ok(true, 'délégations du socle absentes de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;
  update public.entites set fuseau = 'America/Guadeloupe' where client_id = client and principale;

  -- ── TFILED-10 : « du 20/10 au 29/10 » en Guadeloupe ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.delegations (client_id, delegant, delegataire, debut, fin, motif)
  values (client, gerant, membre, '2026-10-20'::date, '2026-10-29'::date, 'Congés (essai 66)')
  returning debut, fin into v_debut, v_fin;
  perform tests.redevenir_admin();
  return next is(v_fin, '2026-10-30 00:00'::timestamp at time zone 'America/Guadeloupe',
                 'jusqu''au 29/10 : la délégation vaut tout le 29/10, heure de Guadeloupe');
  return next is(v_debut, '2026-10-20 00:00'::timestamp at time zone 'America/Guadeloupe',
                 'à partir du 20/10 : 0 h, heure de Guadeloupe');
  return next ok(v_fin > '2026-10-29 20:00'::timestamp at time zone 'America/Guadeloupe',
                 'elle ne s''éteint plus le 28/10 à 20 h (ni le 29/10 à 20 h)');

  -- Une borne à l'heure précise n'est pas touchée.
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.delegations (client_id, delegant, delegataire, debut, fin)
  values (client, gerant, membre, '2026-11-02 13:30+00', '2026-11-03 09:15+00')
  returning fin into v_fin;
  perform tests.redevenir_admin();
  return next is(v_fin, '2026-11-03 09:15+00'::timestamptz, 'une fin à l''heure précise reste telle quelle');

  -- ── TFILED-09 : les refus sont des phrases ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  begin
    insert into public.delegations (client_id, delegant, delegataire) values (client, gerant, membre);
    code := 'accepté';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  return next ok(code <> 'accepté' and msg like 'Une délégation a toujours une fin%', 'sans fin : ' || coalesce(msg, 'accepté !'));
  code := null; msg := null;
  begin
    insert into public.delegations (client_id, delegant, delegataire, debut, fin)
    values (client, gerant, membre, '2026-11-10 12:00+00', '2026-11-09 12:00+00');
    code := 'accepté';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next ok(code = '23514' and msg like 'La fin de la délégation doit venir après son début%', 'fin avant début : ' || coalesce(msg, 'accepté !'));
end $f$;

select * from runtests('tests'::name, '^test_66_');
