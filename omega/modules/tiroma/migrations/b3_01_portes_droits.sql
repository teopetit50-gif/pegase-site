-- b3_01 — Les trois portes publiques de TIROMA sont exécutables par un titulaire et vérifient ses droits.
--
-- CE QUE ÇA CORRIGE (relevé le 05/10/2026 à la lecture de SOCLE-EXTRAITS-TIROMA.sql et de
-- a5_01_liste_figee.txt) :
--   1. public.tiroma_installer_cabinet / tiroma_brancher_cabinet / tiroma_changer_mode sont des
--      enveloppes `language sql` SECURITY INVOKER vers private.tiroma_* ; ni les enveloppes ni les
--      fonctions privées ne sont exécutables par `authenticated` (absentes de la liste figée d'a5_01)
--      → « permission denied for function » pour un titulaire qui installe son cabinet depuis l'espace.
--   2. Les fonctions privées ne vérifient AUCUN droit : un compte qui aurait EXECUTE pourrait installer,
--      brancher ou changer le mode d'un cabinet chez n'importe quelle organisation.
--
-- CE QUE ÇA POSE : les corps des trois fonctions privées, repris à l'identique de la photographie du
-- 05/10, avec en tête le même contrôle que Tamila (« Seul un gérant, ou Omega, installe ») :
--   · installer / brancher : auth.uid() présent → gérant de l'organisation ET entité vue
--     (private.a_un_role + private.voit_entite) ; sans auth.uid() → service_role ou postgres seulement ;
--   · changer le mode : titulaire du cabinet (private.tiroma_est_titulaire), ou Omega.
-- Puis les GRANT que la règle d'a5_01 (b) légitime : la porte publique SECURITY INVOKER exécutable par
-- authenticated, et la fonction privée qu'elle appelle. Rien d'autre ne change.
--
-- Idempotent : create or replace, grant. Aucun DROP, aucun DELETE.

create or replace function private.tiroma_role_session()
 returns text
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('role', true), ''),
                  current_user::text)
$function$;

comment on function private.tiroma_role_session() is
  'Le rôle de la session : celui du jeton (authenticated, service_role, anon), sinon le rôle SQL courant (postgres pour un cron).';

-- Le contrôle commun aux portes d'installation et de branchement.
create or replace function private.tiroma_exiger_gerant(p_client uuid, p_entite uuid, p_quoi text)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    if private.tiroma_role_session() not in ('service_role', 'postgres') then
      raise exception 'Seul un gérant de l''organisation, ou Omega, % un cabinet.', p_quoi using errcode = '42501';
    end if;
  elsif not private.a_un_role(p_client, array['gerant']) or not private.voit_entite(p_client, p_entite) then
    raise exception 'Seul un gérant de l''organisation, ou Omega, % un cabinet, sur une entité qu''il voit.', p_quoi using errcode = '42501';
  end if;
end $function$;

-- ─── Installer ─────────────────────────────────────────────────────────────
create or replace function private.tiroma_installer_cabinet(p_client uuid, p_entite uuid, p_logiciel text, p_perimetre text default 'cabinet'::text, p_logiciel_version text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid;
  v_fuseau text;
  v_territoire text;
  v_fuseau_territoire text;
  v_complet boolean;
begin
  perform private.tiroma_exiger_gerant(p_client, p_entite, 'installe');
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if not found then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = 'P0002';
  end if;
  v_territoire := private.territoire_de_entite(p_client, p_entite);
  if v_territoire is null then
    raise exception 'Le territoire du cabinet est inconnu : renseignez le code ISO de son entité (GP, FR-971, FR…).'
      using errcode = '22023', hint = 'Tiroma ne suppose jamais la métropole : les jours ouvrés en dépendent.';
  end if;
  select t.fuseau, t.complet into v_fuseau_territoire, v_complet from public.territoires t where t.code = v_territoire;
  if not coalesce(v_complet, false) then
    raise exception 'Les jours fériés de droit local de % ne sont pas au calendrier : Tiroma n''y calcule aucun jour ouvré.', v_territoire
      using errcode = '22023', hint = 'Relever d''abord ces jours dans le texte local (brique B5).';
  end if;
  if v_fuseau is distinct from v_fuseau_territoire then
    raise exception 'Le fuseau de l''entité (%) ne correspond pas à son territoire (%, %).', v_fuseau, v_territoire, v_fuseau_territoire
      using errcode = '22023', hint = '7 h à Pointe-à-Pitre n''est pas 7 h à Paris : le point du matin en dépend.';
  end if;
  insert into public.tiroma_cabinets (client_id, entite_id, logiciel, logiciel_version, perimetre_partage)
  values (p_client, p_entite, p_logiciel, p_logiciel_version, p_perimetre)
  returning id into v_id;
  insert into public.tiroma_regles (client_id, entite_id) values (p_client, p_entite);
  return v_id;
end $function$;

-- ─── Brancher ──────────────────────────────────────────────────────────────
create or replace function private.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text default 'exports'::text, p_libelle text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.tiroma_cabinets;
  e public.entites;
  v_id uuid;
  v_jeux text[];
  v_nom text;
begin
  perform private.tiroma_exiger_gerant(p_client, p_entite, 'branche');
  select * into k from public.tiroma_cabinets where client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Cabinet introuvable : installez-le d''abord (tiroma_installer_cabinet).' using errcode = 'P0002';
  end if;
  if k.statut = 'clos' then
    raise exception 'Ce cabinet est clos.' using errcode = '55000';
  end if;
  select * into e from public.entites where client_id = p_client and id = p_entite;
  if not exists (select 1 from public.modeles_jeux m where m.module = 'tiroma' and m.logiciel = k.logiciel) then
    raise exception 'Aucun modèle d''export pour le logiciel « % » : Tiroma ne lit pour l''instant que Logos_w.', k.logiciel
      using errcode = 'P0002';
  end if;
  v_nom := coalesce(p_libelle, case k.logiciel when 'logosw' then 'Logos_w' when 'julie' then 'Julie' when 'veasy' then 'Veasy'
                                               else initcap(k.logiciel) end || ' — ' || e.nom);
  v_id := private.brancher(p_client, 'tiroma', k.logiciel, p_voie, left(v_nom, 120), p_entite, e.fuseau, null);
  select array_agg(j.code order by private.tiroma_ordre_jeu(j.code)) into v_jeux
  from public.branchements_jeux j where j.branchement_id = v_id;
  update public.tiroma_cabinets set statut = 'actif' where id = k.id and statut in ('installation', 'coupe');
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.connecteur_active', 'tiroma_cabinets', k.id::text,
    jsonb_build_object('branchement', v_id, 'voie', p_voie, 'logiciel', k.logiciel, 'jeux', to_jsonb(v_jeux)), p_entite);
  perform private.battre(p_client, 'tiroma_releve', jsonb_build_object('branchement', v_id, 'etat', 'branche'), interval '3 days');
  return v_id;
end $function$;

-- ─── Changer le mode ───────────────────────────────────────────────────────
create or replace function private.tiroma_changer_mode(p_client uuid, p_entite uuid, p_mode text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_avant text; v_id uuid;
begin
  if (select auth.uid()) is null then
    if private.tiroma_role_session() not in ('service_role', 'postgres') then
      raise exception 'Seul le titulaire du cabinet, ou Omega, change son mode.' using errcode = '42501';
    end if;
  elsif not private.tiroma_est_titulaire(p_client, p_entite) then
    raise exception 'Seul le titulaire du cabinet, ou Omega, change son mode.' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('a_blanc', 'reel') then
    raise exception 'Le mode vaut a_blanc ou reel.' using errcode = '22023';
  end if;
  select k.mode, k.id into v_avant, v_id from public.tiroma_cabinets k
  where k.client_id = p_client and k.entite_id = p_entite for update;
  if not found then
    raise exception 'Cabinet introuvable.' using errcode = 'P0002';
  end if;
  if v_avant = p_mode then
    return;
  end if;
  update public.tiroma_cabinets set mode = p_mode, mode_depuis = now() where id = v_id;
end $function$;

-- ─── Les enveloppes publiques, inchangées, et les droits ───────────────────
create or replace function public.tiroma_installer_cabinet(p_client uuid, p_entite uuid, p_logiciel text, p_perimetre text default 'cabinet'::text, p_logiciel_version text default null::text)
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_installer_cabinet(p_client, p_entite, p_logiciel, p_perimetre, p_logiciel_version)
$function$;

create or replace function public.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text default 'exports'::text, p_libelle text default null::text)
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_brancher_cabinet(p_client, p_entite, p_voie, p_libelle)
$function$;

create or replace function public.tiroma_changer_mode(p_client uuid, p_entite uuid, p_mode text)
 returns void
 language sql
 set search_path to ''
as $function$
  select private.tiroma_changer_mode(p_client, p_entite, p_mode)
$function$;

revoke all on function public.tiroma_installer_cabinet(uuid, uuid, text, text, text) from public, anon;
revoke all on function public.tiroma_brancher_cabinet(uuid, uuid, text, text) from public, anon;
revoke all on function public.tiroma_changer_mode(uuid, uuid, text) from public, anon;
grant execute on function public.tiroma_installer_cabinet(uuid, uuid, text, text, text) to authenticated, service_role;
grant execute on function public.tiroma_brancher_cabinet(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.tiroma_changer_mode(uuid, uuid, text) to authenticated, service_role;

-- Règle (b) d'a5_01 : appelées par une porte publique SECURITY INVOKER exécutable par authenticated.
grant execute on function private.tiroma_installer_cabinet(uuid, uuid, text, text, text) to authenticated, service_role;
grant execute on function private.tiroma_brancher_cabinet(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function private.tiroma_changer_mode(uuid, uuid, text) to authenticated, service_role;
-- Appelées par ces trois-là (fermeture transitive de la même règle).
grant execute on function private.tiroma_exiger_gerant(uuid, uuid, text) to authenticated, service_role;
grant execute on function private.tiroma_role_session() to authenticated, service_role;
