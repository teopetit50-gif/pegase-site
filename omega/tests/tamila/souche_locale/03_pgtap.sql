-- pgTAP imité pour la souche locale : ok, is, isnt, throws_ok, lives_ok, runtests (annule chaque test).
create schema if not exists tests;
create sequence if not exists public.tap_n;
create or replace function public.ok(c boolean, d text default '') returns text language sql as $$
  select case when coalesce(c, false) then 'ok ' else 'not ok ' end || nextval('public.tap_n') || ' - ' || coalesce(d, '') $$;
create or replace function public.is(a anyelement, b anyelement, d text default '') returns text language sql as $$
  select public.ok(a is not distinct from b, d) || case when a is distinct from b then format(' [eu %s, attendu %s]', a, b) else '' end $$;
create or replace function public.isnt(a anyelement, b anyelement, d text default '') returns text language sql as $$
  select public.ok(a is distinct from b, d) $$;
create or replace function public.throws_ok(q text, e text, m text default null, d text default '') returns text language plpgsql as $$
begin
  begin execute q; exception when others then
    return public.ok(sqlstate = e and (m is null or sqlerrm = m), d) || case when sqlstate <> e or (m is not null and sqlerrm <> m) then format(' [eu %s : %s]', sqlstate, sqlerrm) else '' end;
  end;
  return public.ok(false, d) || ' [aucune erreur]';
end $$;
create or replace function public.lives_ok(q text, d text default '') returns text language plpgsql as $$
begin
  begin execute q; exception when others then return public.ok(false, d) || format(' [%s : %s]', sqlstate, sqlerrm); end;
  return public.ok(true, d);
end $$;
create or replace function public.runtests(s name, motif text) returns setof text language plpgsql as $$
declare f record; lignes text[]; l text;
begin
  for f in select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = s and p.proname ~ motif order by p.proname loop
    lignes := array['# ' || f.proname];
    begin
      for l in execute format('select * from %I.%I()', s, f.proname) loop lignes := lignes || l; end loop;
      raise exception 'annuler' using errcode = 'P9999';
    exception when sqlstate 'P9999' then null;
              when others then lignes := lignes || ('not ok - EXCEPTION ' || sqlstate || ' : ' || sqlerrm);
    end;
    return query select unnest(lignes);
  end loop;
end $$;
grant usage on schema public to authenticated, service_role;
grant usage, select on sequence public.tap_n to authenticated, service_role, anon;
