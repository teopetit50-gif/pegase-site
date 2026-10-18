-- a5_omega — Omega, son propre client réel SUR LA RECETTE (décision de Teo, 18/10/2026 ; client créé par A3, slug
-- 'omega'). Ce test prouve, pour ce client :
--   1. tous ses réglages d'envoi sont en essai, chacun avec une adresse d'essai, ou coupés (plus strict) ; aucun en « reel » ;
--   2. aucun envoi « reel » n'est possible : aucun n'existe, et pour chaque module connu le réglage effectif du socle
--      (private.reglages_envois_effectifs, celui que lisent preparer_envoi et verrous_envoi) n'est jamais « reel » ;
--   3. les comptes OFFLOAD importés sont dormants (aucun envoi ne leur est parti en réel) et sans consentement
--      (aucune ligne de public.consentements pour leur adresse) ;
--   4. aucune donnée n'a fui vers une autre organisation : un membre d'une autre organisation ne lit aucune ligne
--      d'Omega dans aucune table locataire ; aucune ligne d'une autre organisation ne pointe une entité d'Omega ;
--      aucune adresse des comptes importés d'Omega n'apparaît chez une autre organisation.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et les poses d'A3, A2, C2, C3, C4, A4.
-- Lecture seule sur les données d'Omega ; runtests() annule ce que tests.jeu() écrit (deux clients fictifs).
-- Le client se trouve par son slug : colonne clients.slug si elle existe, sinon clients.config ->> 'slug'.

create or replace function tests.test_a5_omega_client_reel() returns setof text
language plpgsql as $f$
declare
  omega uuid; n bigint; m bigint; jeu jsonb; user_a uuid; r record; v_mode text; fuites text[] := '{}'; tables text[]; t text;
begin
  -- ── Le client ──
  select count(*) into n from public.clients c
  where coalesce(to_jsonb(c) ->> 'slug', to_jsonb(c) -> 'config' ->> 'slug') = 'omega';
  return next is(n, 1::bigint, 'un et un seul client de slug « omega » sur la recette');
  if n <> 1 then return; end if;
  select c.id into omega from public.clients c where coalesce(to_jsonb(c) ->> 'slug', to_jsonb(c) -> 'config' ->> 'slug') = 'omega';

  -- ── 1. Réglages d'envoi : tous en essai ──
  select count(*), count(*) filter (where g.mode not in ('essai', 'coupe') or (g.mode = 'essai' and g.essai_adresse is null)) into n, m
  from public.reglages_envois g where g.client_id = omega;
  return next ok(n > 0, format('Omega a des réglages d''envoi (%s ligne(s))', n));
  return next is(m, 0::bigint, 'tous les réglages d''envoi d''Omega sont en essai (avec une adresse d''essai) ou coupés');

  -- ── 2. Aucun envoi réel possible ──
  select count(*) into n from public.envois e where e.client_id = omega and e.mode = 'reel';
  return next is(n, 0::bigint, 'aucun envoi « reel » n''existe pour Omega');
  for r in select me.module from private.modules_envois me order by me.module loop
    v_mode := private.reglages_envois_effectifs(omega, r.module) ->> 'mode';
    if v_mode = 'reel' then fuites := fuites || r.module; end if;
  end loop;
  return next is(fuites, '{}'::text[], 'pour chaque module, le réglage effectif du socle n''est jamais « reel » (essai, coupé ou absent : rien de réel ne part)');
  fuites := '{}';

  -- ── 3. Comptes OFFLOAD importés : dormants et sans consentement ──
  if to_regclass('public.offload_comptes') is null then
    return next ok(true, 'OFFLOAD absent de cet environnement : sans objet');
  else
    execute $q$select count(*) from public.offload_comptes o where o.client_id = $1 and o.source = 'import'$q$ into n using omega;
    return next ok(n > 0, format('Omega a des comptes OFFLOAD importés (%s)', n));
    execute $q$
      select count(*) from public.offload_comptes o
      where o.client_id = $1 and o.source = 'import' and nullif(btrim(o.email), '') is not null
        and exists (select 1 from public.consentements k
                    where k.client_id = $1 and lower(k.adresse) = lower(btrim(o.email)))$q$ into n using omega;
    return next is(n, 0::bigint, 'aucun compte importé n''a de consentement noté');
    execute $q$
      select count(*) from public.offload_comptes o
      where o.client_id = $1 and o.source = 'import'
        and exists (select 1 from public.envois e
                    where e.client_id = $1 and e.mode = 'reel'
                      and (lower(e.destinataire_adresse) = lower(btrim(o.email))
                           or e.destinataire_adresse = btrim(o.telephone)))$q$ into n using omega;
    return next is(n, 0::bigint, 'aucun compte importé n''a reçu d''envoi réel : ils sont dormants');

    -- Leurs adresses n'apparaissent chez aucune autre organisation.
    execute $q$
      select count(*) from public.offload_comptes o
      where o.client_id = $1 and o.source = 'import' and nullif(btrim(o.email), '') is not null
        and (exists (select 1 from public.offload_comptes x where x.client_id <> $1 and lower(x.email) = lower(btrim(o.email)))
             or exists (select 1 from public.consentements k where k.client_id <> $1 and lower(k.adresse) = lower(btrim(o.email)))
             or exists (select 1 from public.envois e where e.client_id <> $1 and lower(e.destinataire_adresse) = lower(btrim(o.email))))$q$
      into n using omega;
    return next is(n, 0::bigint, 'aucune adresse des comptes importés d''Omega n''apparaît chez une autre organisation');
  end if;

  -- ── 4. Aucune fuite vers une autre organisation ──
  -- a) Une ligne d'une autre organisation qui pointe une entité d'Omega.
  for r in select t.table_name from information_schema.columns t
           join information_schema.columns c2 on c2.table_schema = t.table_schema and c2.table_name = t.table_name
                                              and c2.column_name = 'client_id'
           join information_schema.tables tb on tb.table_schema = t.table_schema and tb.table_name = t.table_name
                                            and tb.table_type = 'BASE TABLE'
           where t.table_schema = 'public' and t.column_name = 'entite_id' order by 1 loop
    execute format('select count(*) from public.%I x where x.client_id <> $1
                    and x.entite_id in (select e.id from public.entites e where e.client_id = $1)', r.table_name)
      into n using omega;
    if n > 0 then fuites := fuites || format('%s (%s)', r.table_name, n); end if;
  end loop;
  return next is(fuites, '{}'::text[], 'aucune ligne d''une autre organisation ne pointe une entité d''Omega');
  fuites := '{}';

  -- b) Un membre d'une autre organisation (client fictif A) ne lit rien d'Omega, table locataire par table locataire.
  jeu := tests.jeu();
  user_a := (jeu ->> 'user_a')::uuid;
  select array_agg(l.nom order by l.nom) into tables from private.tables_locataires l
  where to_regclass('public.' || quote_ident(l.nom)) is not null;   -- lu avant d'endosser : private est fermé
  perform tests.endosser(user_a);
  foreach t in array coalesce(tables, '{}') loop
    begin
      execute format('select count(*) from public.%I where client_id = $1', t) into n using omega;
    exception when insufficient_privilege then n := 0;   -- pas même le droit de lire : rien ne fuit
    end;
    if n > 0 then fuites := fuites || format('%s (%s)', t, n); end if;
  end loop;
  select count(*) into n from public.clients c where c.id = omega;
  if n > 0 then fuites := fuites || 'clients (1)'::text; end if;
  perform tests.redevenir_admin();
  return next is(fuites, '{}'::text[], 'un membre d''une autre organisation ne lit aucune ligne d''Omega (toutes les tables locataires, et sa fiche)');
end $f$;

select * from runtests('tests'::name, '^test_a5_omega_');
