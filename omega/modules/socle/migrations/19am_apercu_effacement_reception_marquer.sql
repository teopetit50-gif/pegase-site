-- 19am_apercu_effacement_reception_marquer.sql — deux portes du socle pour les écrans d'A3 (A5, 06/10/2026).
--
-- 1. public.apercu_effacement(client) : ce que l'effacement prouvé effacerait, sans rien effacer ni écrire.
--    Tables locataires (private.tables_locataires, dans l'ordre d'effacement) avec leur nombre de lignes du client,
--    comptes rattachés, et fichiers (private.fichiers_de, la même source que preparer_effacement et exporter_client).
--    Réservée au gérant ou à un admin du client (private.a_un_role, sur auth.uid()). preparer_effacement, elle, écrit
--    un manifeste : l'aperçu ne l'appelle pas.
-- 2. public.reception_marquer(reception, statut) : « lue », « ecartee » ou « nouvelle ». Ouverte à qui peut lire la
--    réception : membre du client, dans son périmètre (politique de 18a), et selon la règle du module (19ak). La table
--    ne connaît pas « ecartee » : c'est son « ignoree » (CHECK de 18a, inchangé). Une réception traitée ou indésirable
--    ne se remarque pas. Chaque changement est inscrit au journal opposable (reception.marquee).
-- Rien n'est supprimé. Idempotent : rejouable sans effet.

create or replace function public.apercu_effacement(p_client uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_n bigint;
  v_tables jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_fichiers jsonb;
begin
  if p_client is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''aperçu de l''effacement est réservé au gérant de l''organisation.' using errcode = '42501';
  end if;
  for r in select t.nom, t.ordre_effacement from private.tables_locataires t order by t.ordre_effacement, t.nom loop
    if to_regclass(format('public.%I', r.nom)) is null
       or not exists (select 1 from pg_attribute a where a.attrelid = to_regclass(format('public.%I', r.nom))
                      and a.attname = 'client_id' and not a.attisdropped) then
      continue;
    end if;
    execute format('select count(*) from public.%I x where x.client_id = $1', r.nom) into v_n using p_client;
    v_tables := v_tables || jsonb_build_array(jsonb_build_object('table', r.nom, 'ordre', r.ordre_effacement, 'lignes', v_n));
    v_total := v_total + v_n;
  end loop;

  select jsonb_build_object(
           'nombre', count(*),
           'octets', coalesce(sum(f.octets), 0),
           'liste', coalesce(jsonb_agg(jsonb_build_object('bucket', f.bucket, 'nom', f.nom, 'octets', f.octets)
                                       order by f.bucket, f.nom) filter (where f.rang <= 1000), '[]'::jsonb),
           'liste_tronquee', count(*) > 1000)
    into v_fichiers
  from (select g.*, row_number() over (order by g.bucket, g.nom) as rang from private.fichiers_de(p_client) g) f;

  return jsonb_build_object(
    'client', p_client,
    'calcule_le', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'tables', v_tables,
    'lignes', v_total,
    'comptes', (select count(*) from public.comptes c where c.client_id = p_client),
    'fichiers', v_fichiers,
    'rien_n_est_efface', true);
end $$;
comment on function public.apercu_effacement(uuid) is
  'Ce que l''effacement prouvé effacerait (tables et lignes, comptes, fichiers), sans rien effacer ni écrire. Gérant ou admin (19am).';
revoke all on function public.apercu_effacement(uuid) from public, anon;
grant execute on function public.apercu_effacement(uuid) to authenticated, service_role;

create or replace function public.reception_marquer(p_reception bigint, p_statut text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.receptions%rowtype;
  v_cible text;
begin
  if p_statut is null or p_statut not in ('lue', 'ecartee', 'nouvelle') then
    raise exception 'Statut attendu : lue, ecartee ou nouvelle.' using errcode = '22023';
  end if;
  v_cible := case p_statut when 'ecartee' then 'ignoree' else p_statut end;
  select * into r from public.receptions where id = p_reception for update;
  -- Même réponse pour une réception absente ou illisible : la porte ne révèle pas ce qu'on ne peut pas lire.
  if not found or v_uid is null
     or r.client_id not in (select private.mes_clients())
     or not private.perimetre_couvre(v_uid, r.client_id, r.entite_id)
     or not private.reception_lisible(r.client_id, private.reception_module_effectif(r.client_id, r.module, r.canal, r.boite), v_uid) then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  if r.statut in ('traitee', 'indesirable') then
    raise exception 'Cette réception est déjà %, elle ne se remarque pas.', r.statut using errcode = '55000';
  end if;
  if r.statut = v_cible then
    return r.statut;
  end if;
  update public.receptions
     set statut = v_cible,
         traite_par = case when v_cible = 'nouvelle' then null else v_uid end,
         maj_le = now()
   where id = p_reception;
  perform private.journaliser(r.client_id, 'reception.marquee', 'reception', p_reception::text,
                              jsonb_build_object('de', r.statut, 'a', v_cible), r.entite_id);
  return v_cible;
end $$;
comment on function public.reception_marquer(bigint, text) is
  'Marque une réception lue, écartée (statut ignoree) ou nouvelle ; qui peut la lire (18a + 19ak) ; journal reception.marquee (19am).';
revoke all on function public.reception_marquer(bigint, text) from public, anon;
grant execute on function public.reception_marquer(bigint, text) to authenticated, service_role;
