-- b4_11 — Tamila : l'effacement RÉEL des fichiers d'un dossier à son échéance (session B4, 06/10/2026, carnet du
-- coordinateur, n° 1 ; omega/AUDIT-PROMESSES.md § 2).
--
-- POURQUOI. La ronde horaire (tamila_tache_horaire) dépose `tamila.effacer_dossier` à l'échéance (J+7 après une
-- clôture approuvée, fin d'audit, ouverture refusée), `tamila.purger_export` pour une archive échue et
-- `tamila.detruire_cle` sept jours après l'effacement ; tamila_effacer_dossier exige un manifeste
-- (preparer_effacement) et efface les lignes. Mais aucun ouvrier n'effaçait les FICHIERS au bucket : les pièces
-- chiffrées restaient au stockage, et rien ne vérifiait qu'elles n'y étaient plus avant de poser la preuve.
--
-- CE QUE ÇA POSE (portes serveur, service_role seul ; l'ouvrier est omega/functions/tamila-purge).
--   · tamila_dossier_a_effacer(p_dossier) : refuse tout ce que tamila_effacer_dossier refuserait (dossier non échu,
--     clôture non approuvée, statut ouvert…), prépare le manifeste (preparer_effacement du socle) et rend la liste
--     des fichiers à effacer : ceux du manifeste et tout objet resté sous <client>/tamila_dossier/<dossier>/, dans
--     les seuls buckets des locataires, sous le seul préfixe du cabinet.
--   · tamila_effacer_dossier_verifie(p_dossier) : refuse (55000) tant qu'un fichier du dossier est encore au
--     stockage (objet sous son préfixe, ou chemin d'une de ses pièces) ; sinon appelle tamila_effacer_dossier, qui
--     pose la preuve. L'ordre est donc : liste → effacement au bucket → constat → effacement des lignes.
--   · tamila_fichiers_restants(p_dossier) : le compte, pour l'écran d'état et les tests.
--
-- Rien n'est retiré ; aucune ligne n'est effacée ici (tamila_effacer_dossier et le socle le font). Fonctions
-- private : revoke from public ; grant service_role seul.

create or replace function private.tamila_fichiers_du_dossier(p_client uuid, p_dossier uuid)
returns table (bucket text, nom text)
language sql
stable
security definer
set search_path to ''
as $function$
  select o.bucket_id, o.name
    from storage.objects o
    join private.buckets_locataires b on b.bucket = o.bucket_id
   where starts_with(o.name, p_client::text || '/tamila_dossier/' || p_dossier::text || '/')
  union
  select o.bucket_id, o.name
    from public.pieces p
    join storage.objects o on o.name = p.chemin
    join private.buckets_locataires b on b.bucket = o.bucket_id
   where p.client_id = p_client and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text
$function$;

create or replace function private.tamila_fichiers_restants(p_dossier uuid)
returns integer
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare v_d public.tamila_dossiers;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Le compte des fichiers d''un dossier est tenu par le serveur.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  return (select count(*) from private.tamila_fichiers_du_dossier(v_d.client_id, v_d.id));
end $function$;

create or replace function private.tamila_dossier_a_effacer(p_dossier uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_d public.tamila_dossiers;
  v_demande public.demandes_validation;
  v_prep jsonb;
  v_fichiers jsonb;
  v_prefixe text;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'L''effacement d''un dossier est fait par le serveur, à son échéance.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut = 'efface' then
    return jsonb_build_object('dossier', v_d.id, 'client', v_d.client_id, 'deja_efface', true,
      'fichiers', coalesce((select jsonb_agg(jsonb_build_object('bucket', f.bucket, 'nom', f.nom) order by f.nom)
                              from private.tamila_fichiers_du_dossier(v_d.client_id, v_d.id) f), '[]'::jsonb));
  end if;
  -- Les mêmes refus que tamila_effacer_dossier : aucun fichier ne part d'un dossier qui ne s'effacera pas.
  if v_d.statut = 'clos' then
    select * into v_demande from public.demandes_validation where id = v_d.demande_cloture_id;
    if not found or v_demande.type_action <> 'cloturer_dossier' or v_demande.statut <> 'executee'
       or v_demande.politique_id is not null then
      raise exception 'Aucune clôture approuvée pour ce dossier.' using errcode = '55000';
    end if;
  elsif v_d.statut not in ('audit', 'refuse') then
    raise exception 'Ce dossier n''est pas clos : aucune clôture approuvée.' using errcode = '55000';
  end if;
  if v_d.effacement_prevu_le is null or v_d.effacement_prevu_le > now() then
    raise exception 'L''échéance de l''effacement n''est pas atteinte.' using errcode = '55000';
  end if;

  v_prep := private.preparer_effacement(v_d.client_id, 'tamila_dossier', v_d.id::text);
  v_prefixe := v_d.client_id::text || '/';
  select coalesce(jsonb_agg(x order by x ->> 'nom'), '[]'::jsonb) into v_fichiers
  from (
    select distinct jsonb_build_object('bucket', e ->> 'bucket', 'nom', e ->> 'nom') x
      from jsonb_array_elements(coalesce(v_prep -> 'fichiers', '[]'::jsonb)) e
      join private.buckets_locataires b on b.bucket = e ->> 'bucket'
     where starts_with(e ->> 'nom', v_prefixe) and strpos(e ->> 'nom', '..') = 0
    union
    select jsonb_build_object('bucket', f.bucket, 'nom', f.nom)
      from private.tamila_fichiers_du_dossier(v_d.client_id, v_d.id) f
  ) s;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.effacement.fichiers_listes', 'tamila_dossier',
    v_d.id::text, jsonb_build_object('fichiers', jsonb_array_length(v_fichiers), 'manifeste', v_prep -> 'manifeste'));
  return jsonb_build_object('dossier', v_d.id, 'client', v_d.client_id, 'deja_efface', false, 'fichiers', v_fichiers,
                            'manifeste', v_prep -> 'manifeste');
end $function$;

create or replace function private.tamila_effacer_dossier_verifie(p_dossier uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_d public.tamila_dossiers;
  v_restants integer;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'L''effacement d''un dossier est fait par le serveur, à son échéance.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  select count(*) into v_restants from private.tamila_fichiers_du_dossier(v_d.client_id, v_d.id);
  if v_restants > 0 then
    raise exception 'Des fichiers du dossier sont encore au stockage (%) : le serveur les efface d''abord.', v_restants
      using errcode = '55000';
  end if;
  return private.tamila_effacer_dossier(p_dossier) || jsonb_build_object('fichiers_restants', 0);
end $function$;

create or replace function public.tamila_dossier_a_effacer(p_dossier uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_dossier_a_effacer(p_dossier) $function$;
create or replace function public.tamila_effacer_dossier_verifie(p_dossier uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_effacer_dossier_verifie(p_dossier) $function$;
create or replace function public.tamila_fichiers_restants(p_dossier uuid) returns integer
language sql set search_path to '' as $function$ select private.tamila_fichiers_restants(p_dossier) $function$;

revoke execute on function private.tamila_fichiers_du_dossier(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.tamila_fichiers_restants(uuid) from public, anon, authenticated;
revoke execute on function private.tamila_dossier_a_effacer(uuid) from public, anon, authenticated;
revoke execute on function private.tamila_effacer_dossier_verifie(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_dossier_a_effacer(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_effacer_dossier_verifie(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_fichiers_restants(uuid) from public, anon, authenticated;
grant execute on function private.tamila_fichiers_du_dossier(uuid, uuid) to service_role;
grant execute on function private.tamila_fichiers_restants(uuid) to service_role;
grant execute on function private.tamila_dossier_a_effacer(uuid) to service_role;
grant execute on function private.tamila_effacer_dossier_verifie(uuid) to service_role;
grant execute on function public.tamila_dossier_a_effacer(uuid) to service_role;
grant execute on function public.tamila_effacer_dossier_verifie(uuid) to service_role;
grant execute on function public.tamila_fichiers_restants(uuid) to service_role;
