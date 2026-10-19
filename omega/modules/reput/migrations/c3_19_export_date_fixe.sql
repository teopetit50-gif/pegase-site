-- c3_19 — REPUT : l'export à date fixe (session C3, 19/10/2026)
--
-- Chiffrage #78 (« Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. ») et #93 (« … avec un export
-- daté ») : à la demande, l'écran fabriquait déjà le CSV (export.ts). À date fixe, désormais :
--   · public.reput_exports_programmes : un programme par organisation (ou par site), hebdomadaire (jour de la semaine,
--     1 = lundi) ou mensuel (jour du mois, 1 à 28), actif ou non, et qui est prévenu (des membres de l'organisation).
--   · public.reput_programmer_export(p_client, p_frequence, p_jour, p_entite, p_destinataires, p_actif) — gérant ou
--     administrateur dont le périmètre couvre le site (toute l'organisation : périmètre complet).
--   · La tâche « reput-exports » (chaque jour à 5 h UTC) fabrique, le jour dit, le fichier de la période échue — les sept
--     jours précédents, ou le mois précédent — dans public.reput_exports (CSV « ; », UTF-8 avec BOM, heures de Paris, mêmes
--     colonnes que l'export à la demande, plus le site). Une période n'est fabriquée qu'une fois.
--   · Les destinataires reçoivent un courriel interne (socle 19as, gabarit fermé « reput.export_pret » : une date, un
--     nombre de lignes) qui mène à l'espace : le FICHIER NE PART JAMAIS PAR COURRIEL ; il se télécharge connecté, par le
--     gérant ou un administrateur du périmètre (RLS de reput_exports).
--
-- Règles de pose : create … if not exists, insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

create table if not exists public.reput_exports_programmes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  frequence text not null,
  jour integer not null,
  destinataires uuid[] not null default '{}',
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_exports_programmes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_exports_programmes_frequence_check check (frequence in ('hebdomadaire', 'mensuel')),
  constraint reput_exports_programmes_jour_check check ((frequence = 'hebdomadaire' and jour between 1 and 7)
                                                        or (frequence = 'mensuel' and jour between 1 and 28)),
  constraint reput_exports_programmes_dest_check check (cardinality(destinataires) between 1 and 20)
);
create unique index if not exists reput_exports_programmes_un
  on public.reput_exports_programmes (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.reput_exports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  programme_id uuid not null references public.reput_exports_programmes(id) on delete cascade,
  periode_du date not null,
  periode_au date not null,
  lignes integer not null,
  nom_fichier text not null,
  contenu text not null,
  cree_le timestamptz not null default now(),
  constraint reput_exports_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_exports_une_fois unique (programme_id, periode_du),
  constraint reput_exports_periode_check check (periode_du <= periode_au),
  constraint reput_exports_taille_check check (char_length(contenu) <= 5000000)
);
create index if not exists reput_exports_client_idx on public.reput_exports (client_id, cree_le desc);

-- Le périmètre STRICT d'un export : un site → le périmètre le couvre ; toute l'organisation → périmètre complet
-- (perimetre_couvre du socle tient une entité nulle pour couverte, ce qui ouvrirait le consolidé à un responsable de site).
create or replace function private.reput_couvre_strict(p_user uuid, p_client uuid, p_entite uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case when p_entite is null
              then exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client and c.perimetre_total)
              else private.perimetre_couvre(p_user, p_client, p_entite) end
$function$;

revoke execute on function private.reput_couvre_strict(uuid, uuid, uuid) from public, anon;
grant execute on function private.reput_couvre_strict(uuid, uuid, uuid) to authenticated;

alter table public.reput_exports_programmes enable row level security;
alter table public.reput_exports enable row level security;
revoke all on public.reput_exports_programmes, public.reput_exports from authenticated, anon;
grant select on public.reput_exports_programmes, public.reput_exports to authenticated;
grant all on public.reput_exports_programmes, public.reput_exports to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_exports_programmes'
                 and policyname = 'dirigeants lisent les exports programmes de leur perimetre') then
    create policy "dirigeants lisent les exports programmes de leur perimetre" on public.reput_exports_programmes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin'])
             and private.reput_couvre_strict((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_exports'
                 and policyname = 'dirigeants lisent les exports de leur perimetre') then
    create policy "dirigeants lisent les exports de leur perimetre" on public.reput_exports
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin'])
             and private.reput_couvre_strict((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_exports_programmes', 'reput_exports']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.export_pret', 'fr', 1, 'email',
        'REPUT — l''export programmé est prêt (sans contenu client)',
        'Votre export des demandes clients est prêt — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'L''export programmé des demandes clients de {{organisation}} est prêt : {{nombre}} ligne(s), période échue au {{jour}}.' || chr(10) || chr(10)
        || 'Pour le télécharger : https://omegaai.fr/espace2/reput (onglet « Réglages et avis »)' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le fichier ne part jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date", "nombre": "nombre"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.export_pret' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — courriel « export prêt », 19/10/2026');
    reset role;
  end if;
end $$;

-- Une cellule CSV (séparateur « ; ») et une heure de Paris, comme export.ts.
create or replace function private.reput_csv(p_v text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when coalesce(p_v, '') ~ '[";\r\n]' then '"' || replace(p_v, '"', '""') || '"' else coalesce(p_v, '') end
$function$;

revoke execute on function private.reput_csv(text) from public, anon, authenticated;

-- Le fichier d'une période : une ligne par demande reçue, dans le périmètre du programme.
create or replace function private.reput_fabriquer_export(p_programme uuid, p_du date, p_au date)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_exports_programmes;
  v_csv text;
  v_n integer;
  v_id uuid;
begin
  select * into p from public.reput_exports_programmes x where x.id = p_programme;
  if p.id is null then return null; end if;
  select count(*)::int,
         string_agg(concat_ws(';',
           private.reput_csv(to_char(d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI')),
           private.reput_csv(d.canal),
           private.reput_csv(coalesce(d.de_nom, d.adresse_reponse, '')),
           private.reput_csv(coalesce(s.libelle, d.sujet, '')),
           private.reput_csv(coalesce(d.langue, '')),
           case when d.urgence then 'oui' else 'non' end,
           case when d.couverte is null then '' when d.couverte then 'oui' else 'non' end,
           private.reput_csv(d.statut),
           private.reput_csv(coalesce(to_char(d.envoyee_le at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI'), '')),
           coalesce(greatest(1, round(extract(epoch from (d.envoyee_le - d.recu_le)) / 60))::text, ''),
           case when d.escaladee_le is not null then 'oui' else 'non' end,
           private.reput_csv(coalesce(e.nom, ''))), E'\r\n' order by d.recu_le, d.id)
    into v_n, v_csv
  from public.reput_demandes d
  left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
  left join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  where d.client_id = p.client_id and (p.entite_id is null or d.entite_id = p.entite_id)
    and (d.recu_le at time zone 'Europe/Paris')::date between p_du and p_au;
  v_csv := chr(65279) || 'Reçue le;Canal;Client;Sujet;Langue;Urgente;Tirée de la base;Statut;Répondue le;Délai de réponse (min);'
           || 'Délai de traitement dépassé;Site' || case when v_n > 0 then E'\r\n' || v_csv else '' end;
  insert into public.reput_exports (client_id, entite_id, programme_id, periode_du, periode_au, lignes, nom_fichier, contenu)
  values (p.client_id, p.entite_id, p.id, p_du, p_au, v_n,
          'reput-demandes-' || to_char(p_du, 'YYYY-MM-DD') || '-au-' || to_char(p_au, 'YYYY-MM-DD') || '.csv', v_csv)
  on conflict (programme_id, periode_du) do nothing
  returning id into v_id;
  return v_id;
end $function$;

revoke execute on function private.reput_fabriquer_export(uuid, date, date) from public, anon, authenticated;

-- Le jour dit : la période échue, fabriquée une fois, puis les destinataires prévenus.
create or replace function private.reput_exports_du_jour(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := (p_maintenant at time zone 'Europe/Paris')::date;
  p public.reput_exports_programmes;
  v_du date;
  v_au date;
  v_export uuid;
  v_lignes integer;
  m uuid;
  n integer := 0;
begin
  for p in
    select * from public.reput_exports_programmes x
    where x.actif and ((x.frequence = 'hebdomadaire' and extract(isodow from v_jour) = x.jour)
                       or (x.frequence = 'mensuel' and extract(day from v_jour) = x.jour))
    order by x.client_id, x.id
  loop
    if p.frequence = 'hebdomadaire' then
      v_du := v_jour - 7; v_au := v_jour - 1;
    else
      v_du := (date_trunc('month', v_jour) - interval '1 month')::date; v_au := (date_trunc('month', v_jour) - interval '1 day')::date;
    end if;
    v_export := private.reput_fabriquer_export(p.id, v_du, v_au);
    continue when v_export is null;   -- déjà fabriqué pour cette période
    select x.lignes into v_lignes from public.reput_exports x where x.id = v_export;
    perform private.journaliser_module(p.client_id, 'reput', 'reput.export_fabrique', 'reput_exports', v_export::text,
      jsonb_build_object('programme', p.id, 'du', v_du, 'au', v_au, 'lignes', v_lignes), p.entite_id);
    foreach m in array p.destinataires loop
      continue when not exists (select 1 from public.comptes c where c.client_id = p.client_id and c.user_id = m
                                and c.role in ('gerant', 'admin'))
                    or not private.reput_couvre_strict(m, p.client_id, p.entite_id);
      begin
        perform private.envoyer_interne(p.client_id, 'reput', null, null, 'email', m, 'reput.export_pret',
          jsonb_build_object('jour', to_char(v_au, 'YYYY-MM-DD'), 'nombre', v_lignes),
          'reput.export_pret:' || v_export::text || ':' || m::text, p.entite_id);
      exception when others then
        perform private.journaliser_module(p.client_id, 'reput', 'reput.export_echec', 'reput_exports', v_export::text,
          jsonb_build_object('membre', m, 'erreur', left(sqlerrm, 200)), p.entite_id);
      end;
    end loop;
    n := n + 1;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_exports_du_jour(timestamptz) from public, anon, authenticated;

create or replace function public.reput_programmer_export(p_client uuid, p_frequence text, p_jour integer, p_entite uuid default null,
                                                          p_destinataires uuid[] default null, p_actif boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_dest uuid[] := coalesce(p_destinataires, array[v_uid]);
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''export programmé se règle par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.perimetre_total) then
      raise exception 'L''export de toute l''organisation demande un périmètre complet.' using errcode = '42501';
    end if;
  elsif not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  elsif not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(v_dest) m
             where not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = m and c.role in ('gerant', 'admin'))
                or not private.reput_couvre_strict(m, p_client, p_entite)) then
    raise exception 'Les destinataires sont des gérants ou administrateurs dont le périmètre couvre l''export.' using errcode = '22023';
  end if;
  insert into public.reput_exports_programmes (client_id, entite_id, frequence, jour, destinataires, actif, cree_par)
  values (p_client, p_entite, p_frequence, p_jour, v_dest, coalesce(p_actif, true), v_uid)
  on conflict (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update
    set frequence = excluded.frequence, jour = excluded.jour, destinataires = excluded.destinataires, actif = excluded.actif, maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.export_programme', 'reput_exports_programmes', v_id::text,
    jsonb_build_object('frequence', p_frequence, 'jour', p_jour, 'entite', p_entite, 'destinataires', cardinality(v_dest),
                       'actif', coalesce(p_actif, true), 'par', v_uid), p_entite);
  return jsonb_build_object('programme', v_id, 'frequence', p_frequence, 'jour', p_jour, 'actif', coalesce(p_actif, true));
end $function$;

revoke execute on function public.reput_programmer_export(uuid, text, integer, uuid, uuid[], boolean) from public, anon;
grant execute on function public.reput_programmer_export(uuid, text, integer, uuid, uuid[], boolean) to authenticated, service_role;

-- La tâche : chaque jour à 5 h UTC (6 h ou 7 h à Paris) ; rejouable.
select cron.schedule('reput-exports', '0 5 * * *', $cron$select private.reput_exports_du_jour()$cron$);
