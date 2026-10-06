-- b4_16 — Tamila : l'expertise et ses pièces attendues (session B4, 06/10/2026, demande du coordinateur : la promesse
-- « Pièces attendues du client et de l'expert »).
--
-- POURQUOI. Une expertise judiciaire rythme un dossier : la consignation (à défaut, la désignation est caduque,
-- CPC art. 271), la première réunion, le pré-rapport, le délai pour adresser des dires (art. 276), le rapport
-- définitif (art. 282). Tamila ne les suivait pas ; le cabinet attendait ces pièces sans que rien ne le rappelle.
--
-- CE QUE ÇA POSE.
--   · tamila_expertises : une ligne par expertise d'un dossier ; des DATES et des statuts seulement (l'expert est une
--     partie du dossier, qualité « expert », nom chiffré) ; mission en code (judiciaire | amiable) ; statut en_cours |
--     deposee | abandonnee. RLS : qui voit le dossier. Effacée avec le dossier (tables_objets).
--   · tamila_poser_expertise(p_dossier, p_expertise, p_champs) : créer ou corriger les dates, qui écrit dans le dossier ;
--     dates cohérentes (ordonnance d'abord, dires avant le rapport). tamila_noter_expertise(p_expertise, p_evenement,
--     p_le) : consignation versée, pré-rapport reçu, dires déposés, rapport reçu (le rapport reçu clôt l'expertise),
--     ou abandon.
--   · Le point du matin (b4_14) gagne ses lignes d'expertise : consignation et dires à J-7 (critiques à J-2),
--     pré-rapport et rapport en retard. tamila_point_lignes_personne est remplacée (create or replace), le reste
--     inchangé.
--
-- Rien n'est retiré ni effacé. Fonctions private : revoke from public ; grant authenticated (portes), service_role.

create table if not exists public.tamila_expertises (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  mission text not null default 'judiciaire',
  statut text not null default 'en_cours',
  ordonnee_le date,
  consignation_avant date,
  consignation_versee_le date,
  premiere_reunion_le date,
  pre_rapport_attendu_le date,
  pre_rapport_recu_le date,
  dires_jusqu_au date,
  dires_deposes_le date,
  rapport_attendu_le date,
  rapport_recu_le date,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint tamila_expertises_mission_check check (mission in ('judiciaire', 'amiable')),
  constraint tamila_expertises_statut_check check (statut in ('en_cours', 'deposee', 'abandonnee')),
  constraint tamila_expertises_ordre check (
    (ordonnee_le is null or consignation_avant is null or consignation_avant >= ordonnee_le)
    and (ordonnee_le is null or rapport_attendu_le is null or rapport_attendu_le >= ordonnee_le)
    and (dires_jusqu_au is null or rapport_attendu_le is null or dires_jusqu_au <= rapport_attendu_le)
    and (pre_rapport_attendu_le is null or dires_jusqu_au is null or pre_rapport_attendu_le <= dires_jusqu_au))
);
create index if not exists tamila_expertises_dossier on public.tamila_expertises (dossier_id);
comment on table public.tamila_expertises is
  'Tamila (B4, b4_16) : les expertises d''un dossier et leurs échéances ; des dates, aucun nom (l''expert est une partie chiffrée).';

do $droits$
begin
  alter table public.tamila_expertises enable row level security;
  revoke all on table public.tamila_expertises from anon, authenticated, service_role;
  grant select on table public.tamila_expertises to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_expertises'
                   and policyname = 'qui voit le dossier voit ses expertises') then
    create policy "qui voit le dossier voit ses expertises" on public.tamila_expertises for select to authenticated
      using (private.tamila_voit_dossier_pour((select auth.uid()), client_id, (dossier_id)::text));
  end if;
  if to_regclass('private.tables_objets') is not null then
    begin
      execute $q$insert into private.tables_objets (nom, objet_type, colonne) select 'tamila_expertises', 'tamila_dossier', 'dossier_id'
               where not exists (select 1 from private.tables_objets t where t.nom = 'tamila_expertises')$q$;
    exception when others then raise notice 'tables_objets : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'tamila_expertises'
               where not exists (select 1 from private.tables_locataires t where t.nom = 'tamila_expertises')$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $droits$;

create or replace function private.tamila_poser_expertise(p_dossier uuid, p_expertise uuid, p_champs jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_x public.tamila_expertises;
  v_inconnues text;
  k text;
begin
  if v_uid is null then
    raise exception 'Une expertise se pose par une personne du dossier.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Les dates de l''expertise forment un objet.' using errcode = '22023';
  end if;
  select string_agg(x, ', ') into v_inconnues from jsonb_object_keys(p_champs) x
   where x not in ('mission', 'ordonnee_le', 'consignation_avant', 'premiere_reunion_le', 'pre_rapport_attendu_le', 'dires_jusqu_au', 'rapport_attendu_le');
  if v_inconnues is not null then
    raise exception 'Champs inconnus : %.', v_inconnues using errcode = '22023';
  end if;
  for k in select jsonb_object_keys(p_champs) loop
    if k <> 'mission' and p_champs -> k <> 'null'::jsonb and (jsonb_typeof(p_champs -> k) <> 'string' or (p_champs ->> k) !~ '^\d{4}-\d{2}-\d{2}$') then
      raise exception 'La date « % » s''écrit AAAA-MM-JJ.', k using errcode = '22023';
    end if;
  end loop;
  if p_expertise is null then
    insert into public.tamila_expertises (client_id, dossier_id, mission, cree_par) values (v_d.client_id, p_dossier, coalesce(p_champs ->> 'mission', 'judiciaire'), v_uid)
    returning * into v_x;
  else
    select * into v_x from public.tamila_expertises where id = p_expertise and dossier_id = p_dossier for update;
    if not found then
      raise exception 'Expertise introuvable dans ce dossier.' using errcode = 'P0002';
    end if;
  end if;
  begin
    update public.tamila_expertises set
      mission = case when p_champs ? 'mission' then p_champs ->> 'mission' else mission end,
      ordonnee_le = case when p_champs ? 'ordonnee_le' then (p_champs ->> 'ordonnee_le')::date else ordonnee_le end,
      consignation_avant = case when p_champs ? 'consignation_avant' then (p_champs ->> 'consignation_avant')::date else consignation_avant end,
      premiere_reunion_le = case when p_champs ? 'premiere_reunion_le' then (p_champs ->> 'premiere_reunion_le')::date else premiere_reunion_le end,
      pre_rapport_attendu_le = case when p_champs ? 'pre_rapport_attendu_le' then (p_champs ->> 'pre_rapport_attendu_le')::date else pre_rapport_attendu_le end,
      dires_jusqu_au = case when p_champs ? 'dires_jusqu_au' then (p_champs ->> 'dires_jusqu_au')::date else dires_jusqu_au end,
      rapport_attendu_le = case when p_champs ? 'rapport_attendu_le' then (p_champs ->> 'rapport_attendu_le')::date else rapport_attendu_le end,
      maj_le = now()
     where id = v_x.id;
  exception when check_violation then
    raise exception 'Dates incohérentes : l''ordonnance d''abord, le pré-rapport avant la fin des dires, les dires avant le rapport.' using errcode = '22023';
  end;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.expertise.posee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('expertise', v_x.id, 'champs', (select jsonb_agg(x) from jsonb_object_keys(p_champs) x), 'par', v_uid));
  return v_x.id;
end $function$;

create or replace function private.tamila_noter_expertise(p_expertise uuid, p_evenement text, p_le date default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_x public.tamila_expertises;
  v_le date := coalesce(p_le, (now() at time zone 'Europe/Paris')::date);
begin
  if v_uid is null then
    raise exception 'Une étape de l''expertise se note par une personne du dossier.' using errcode = '42501';
  end if;
  select * into v_x from public.tamila_expertises where id = p_expertise for update;
  if not found then
    raise exception 'Expertise introuvable.' using errcode = 'P0002';
  end if;
  perform private.tamila_dossier_ecrit(v_x.dossier_id, false);
  if v_x.statut <> 'en_cours' then
    raise exception 'Cette expertise est close (%).', v_x.statut using errcode = '55000';
  end if;
  if v_le > (now() at time zone 'Europe/Paris')::date then
    raise exception 'Une étape se note au jour où elle a eu lieu, pas après.' using errcode = '22023';
  end if;
  if p_evenement = 'consignation_versee' then
    update public.tamila_expertises set consignation_versee_le = v_le, maj_le = now() where id = v_x.id;
  elsif p_evenement = 'pre_rapport_recu' then
    update public.tamila_expertises set pre_rapport_recu_le = v_le, maj_le = now() where id = v_x.id;
  elsif p_evenement = 'dires_deposes' then
    update public.tamila_expertises set dires_deposes_le = v_le, maj_le = now() where id = v_x.id;
  elsif p_evenement = 'rapport_recu' then
    update public.tamila_expertises set rapport_recu_le = v_le, statut = 'deposee', maj_le = now() where id = v_x.id;
  elsif p_evenement = 'abandon' then
    update public.tamila_expertises set statut = 'abandonnee', maj_le = now() where id = v_x.id;
  else
    raise exception 'Étape inconnue : %.', coalesce(p_evenement, 'vide') using errcode = '22023';
  end if;
  perform private.journaliser_module(v_x.client_id, 'tamila', 'tamila.expertise.' || p_evenement, 'tamila_dossier', v_x.dossier_id::text,
    jsonb_build_object('expertise', v_x.id, 'le', v_le, 'par', v_uid));
end $function$;

create or replace function public.tamila_poser_expertise(p_dossier uuid, p_expertise uuid, p_champs jsonb) returns uuid
language sql set search_path to '' as $function$ select private.tamila_poser_expertise(p_dossier, p_expertise, p_champs) $function$;
create or replace function public.tamila_noter_expertise(p_expertise uuid, p_evenement text, p_le date default null) returns void
language sql set search_path to '' as $function$ select private.tamila_noter_expertise(p_expertise, p_evenement, p_le) $function$;

revoke execute on function private.tamila_poser_expertise(uuid, uuid, jsonb) from public;
revoke execute on function public.tamila_poser_expertise(uuid, uuid, jsonb) from public, anon;
revoke execute on function private.tamila_noter_expertise(uuid, text, date) from public;
revoke execute on function public.tamila_noter_expertise(uuid, text, date) from public, anon;
grant execute on function private.tamila_poser_expertise(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.tamila_poser_expertise(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function private.tamila_noter_expertise(uuid, text, date) to authenticated, service_role;
grant execute on function public.tamila_noter_expertise(uuid, text, date) to authenticated, service_role;

-- Le point du matin (b4_14), avec les lignes de l'expertise : la fonction est remplacée telle quelle, plus le bloc 6.
create or replace function private.tamila_point_lignes_personne(p_client uuid, p_user uuid, p_role text, p_jour date,
                                                                p_maintenant timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer;
  v_avocat boolean := p_role in ('gerant', 'admin', 'valideur');
  v_plus_ancien timestamptz;
  v_ecart integer;
  v_lien constant text := '/espace/tamila';
begin
  -- 1. Les délais à confirmer (un avocat confirme).
  if v_avocat then
    select count(*), min(t.cree_le) into v_n, v_plus_ancien from public.tamila_delais t
     where t.client_id = p_client and t.statut = 'a_confirmer'
       and t.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x);
    if v_n > 0 then
      v_items := v_items || jsonb_build_object(
        'texte', format('%s délai%s de procédure à confirmer, le plus ancien posé le %s', v_n, case when v_n > 1 then 's' else '' end,
                        to_char(v_plus_ancien at time zone 'Europe/Paris', 'DD/MM/YYYY')),
        'gravite', case when v_plus_ancien < p_maintenant - interval '48 hours' then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
  end if;

  -- 2. Les échéances : dépassées sans acte déposé, puis celles des sept jours.
  for r in
    select t.echeance_retenue, t.acte, t.statut from public.tamila_delais t
     where t.client_id = p_client and t.statut in ('a_confirmer', 'confirme') and t.acte_depose_le is null
       and t.echeance_retenue <= p_jour + 7
       and t.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x)
     order by t.echeance_retenue, t.acte
     limit 20
  loop
    v_ecart := r.echeance_retenue - p_jour;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('Échéance %s%s : %s%s',
                           case when v_ecart < 0 then 'dépassée du ' else 'le ' end, to_char(r.echeance_retenue, 'DD/MM/YYYY'),
                           private.tamila_point_libelle_acte(r.acte),
                           case when v_ecart = 0 then ' (aujourd''hui)' when v_ecart = 1 then ' (demain)' when v_ecart > 1 then format(' (dans %s jours)', v_ecart)
                                else format(' (%s jour%s de retard)', -v_ecart, case when v_ecart < -1 then 's' else '' end) end
                           || case when r.statut = 'a_confirmer' then ', délai encore à confirmer' else '' end), 300),
      'gravite', case when v_ecart <= 2 then 'critique' else 'attention' end, 'lien', v_lien);
  end loop;

  -- 3. Les audiences d'aujourd'hui et de demain.
  for r in
    select a.date_heure, a.heure_connue, a.nature from public.tamila_audiences a
     where a.client_id = p_client and a.statut = 'prevue'
       and (a.date_heure at time zone 'Europe/Paris')::date between p_jour and p_jour + 1
       and (a.avocat_id = p_user or (a.avocat_id is null
            and a.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x)))
     order by a.date_heure
     limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', format('%s %s%s', private.tamila_point_libelle_audience(r.nature),
                      case when (r.date_heure at time zone 'Europe/Paris')::date = p_jour then 'aujourd''hui' else 'demain' end,
                      case when r.heure_connue then ' à ' || replace(to_char(r.date_heure at time zone 'Europe/Paris', 'HH24 "h" MI'), ' h 00', ' h') else '' end),
      'gravite', case when (r.date_heure at time zone 'Europe/Paris')::date = p_jour then 'attention' else 'info' end, 'lien', v_lien);
  end loop;

  -- 4. Les audiences des trois derniers jours sans temps saisi (b4_12).
  select count(*) into v_n from public.tamila_audiences a
   where a.client_id = p_client and a.avocat_id = p_user and a.statut in ('prevue', 'tenue')
     and a.date_heure < p_maintenant and a.date_heure >= p_maintenant - interval '3 days'
     and not exists (select 1 from public.tamila_temps t where t.user_id = p_user and t.origine = 'audience:' || a.id::text and t.statut <> 'annule')
     and not exists (select 1 from public.tamila_temps_ecartes e where e.user_id = p_user and e.origine = 'audience:' || a.id::text);
  if v_n > 0 then
    v_items := v_items || jsonb_build_object(
      'texte', format('%s audience%s passée%s sans temps saisi : le temps est proposé dans le dossier', v_n,
                      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end),
      'gravite', 'info', 'lien', v_lien);
  end if;

  -- 5. Les avis reçus par courriel, à rattacher (qui peut lire la réception).
  if private.tamila_peut_lire_reception(p_client, p_user) then
    select count(*), min(e.expire_le) into v_n, v_plus_ancien from public.tamila_avis_entrants e
     where e.client_id = p_client and e.statut = 'a_rattacher';
    if v_n > 0 then
      v_items := v_items || jsonb_build_object(
        'texte', format('%s avis RPVA reçu%s par courriel à rattacher ; le premier s''efface le %s s''il ne l''est pas', v_n,
                        case when v_n > 1 then 's' else '' end, to_char(v_plus_ancien at time zone 'Europe/Paris', 'DD/MM/YYYY')),
        'gravite', case when v_plus_ancien < p_maintenant + interval '2 days' then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
  end if;

  -- 6. L'expertise (b4_16) : consignation, dires, pré-rapport et rapport attendus, sur mes dossiers.
  for r in
    select x.consignation_avant, x.consignation_versee_le, x.dires_jusqu_au, x.dires_deposes_le,
           x.pre_rapport_attendu_le, x.pre_rapport_recu_le, x.rapport_attendu_le, x.rapport_recu_le
      from public.tamila_expertises x
     where x.client_id = p_client and x.statut = 'en_cours'
       and x.dossier_id in (select y.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) y)
     limit 10
  loop
    if r.consignation_avant is not null and r.consignation_versee_le is null and r.consignation_avant <= p_jour + 7 then
      v_items := v_items || jsonb_build_object('texte', format('Expertise : consignation à verser %s le %s (sinon la désignation de l''expert est caduque, art. 271 CPC)',
        case when r.consignation_avant < p_jour then 'depuis' else 'avant' end, to_char(r.consignation_avant, 'DD/MM/YYYY')),
        'gravite', case when r.consignation_avant <= p_jour + 2 then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
    if r.dires_jusqu_au is not null and r.dires_deposes_le is null and r.dires_jusqu_au <= p_jour + 7 then
      v_items := v_items || jsonb_build_object('texte', format('Expertise : dires à adresser à l''expert %s le %s',
        case when r.dires_jusqu_au < p_jour then 'depuis' else 'au plus tard' end, to_char(r.dires_jusqu_au, 'DD/MM/YYYY')),
        'gravite', case when r.dires_jusqu_au <= p_jour + 2 then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
    if r.pre_rapport_attendu_le is not null and r.pre_rapport_recu_le is null and r.pre_rapport_attendu_le < p_jour then
      v_items := v_items || jsonb_build_object('texte', format('Expertise : pré-rapport attendu le %s, pas encore reçu', to_char(r.pre_rapport_attendu_le, 'DD/MM/YYYY')),
        'gravite', 'attention', 'lien', v_lien);
    end if;
    if r.rapport_attendu_le is not null and r.rapport_recu_le is null and r.rapport_attendu_le < p_jour then
      v_items := v_items || jsonb_build_object('texte', format('Expertise : rapport définitif attendu le %s, pas encore déposé', to_char(r.rapport_attendu_le, 'DD/MM/YYYY')),
        'gravite', 'attention', 'lien', v_lien);
    end if;
  end loop;
  return v_items;
end $function$;

revoke execute on function private.tamila_point_lignes_personne(uuid, uuid, text, date, timestamptz) from public, anon, authenticated;
grant execute on function private.tamila_point_lignes_personne(uuid, uuid, text, date, timestamptz) to service_role;
