-- b4_15 — Tamila : demander une lecture longue d'un dossier (session B4, 06/10/2026, carnet du coordinateur, n° 4 ;
-- contrat omega/CONTRAT-ANALYSE.md d'A1, socle 19an_analyses.sql). À poser APRÈS 19an.
--
-- POURQUOI. Le lecteur (A1) sait désormais lire un dossier de N pièces et rendre des constats cités page et ligne :
-- pré-lecture, chronologie, contradictions, bordereau. Le socle 19an tient la table analyses et
-- private.demander_analyse ; il revient au module de dire QUI peut demander, SUR QUELLES pièces, et qui lit.
--
-- CE QUE ÇA POSE.
--   · tamila_demander_analyse(p_dossier, p_type, p_pieces default null) → uuid : un avocat qui écrit dans le dossier
--     (tamila_dossier_ecrit, avocat) ; type prelecture | chronologie | contradictions | bordereau ; la clé du dossier
--     au coffre Scaleway (le serveur ne peut rien chiffrer sous la phrase du cabinet : 55000 « passez au coffre ») ;
--     les pièces chiffrées du dossier déjà lues (toutes par défaut, ou celles choisies, qui doivent en être) ; 200 au
--     plus, 60 pour la pré-lecture ; une analyse du même type déjà en cours est rendue telle quelle.
--   · Une politique RESTRICTIVE sur public.analyses : une analyse Tamila ne se lit que par qui voit le dossier
--     (tamila_voit_dossier_pour, murailles comprises), quel que soit le gardien inscrit pour voit_objet.
-- Rien n'est retiré ni effacé. Porte private : revoke from public, grant authenticated.

create or replace function private.tamila_demander_analyse(p_dossier uuid, p_type text, p_pieces uuid[] default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_type text;
  v_pieces uuid[];
  v_max integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Une analyse se demande par un avocat du dossier.' using errcode = '42501';
  end if;
  if to_regclass('public.analyses') is null then
    raise exception 'Les analyses ne sont pas encore installées sur cette base.' using errcode = '55000';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, true);
  if p_type is null or p_type not in ('prelecture', 'chronologie', 'contradictions', 'bordereau') then
    raise exception 'Type d''analyse inconnu : %.', coalesce(p_type, 'vide') using errcode = '22023';
  end if;
  v_type := 'tamila.' || p_type;
  if not exists (select 1 from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active' and k.fournisseur = 'scaleway') then
    raise exception 'La clé de ce dossier est sous la phrase du cabinet : le serveur ne peut ni lire ni chiffrer l''analyse. Passez le cabinet au coffre.'
      using errcode = '55000';
  end if;

  if p_pieces is null then
    select coalesce(array_agg(p.id order by p.recue_le), '{}') into v_pieces from public.pieces p
     where p.client_id = v_d.client_id and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text
       and p.chiffrement = 'dossier:v1' and p.statut in ('lue', 'a_verifier');
  else
    if exists (select 1 from unnest(p_pieces) x(id) where not exists (
                 select 1 from public.pieces p where p.id = x.id and p.client_id = v_d.client_id
                    and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text)) then
      raise exception 'Une pièce demandée n''est pas de ce dossier.' using errcode = '22023';
    end if;
    select coalesce(array_agg(distinct x), '{}') into v_pieces from unnest(p_pieces) x;
  end if;
  if cardinality(v_pieces) = 0 then
    raise exception 'Aucune pièce lue dans ce dossier : l''analyse attend que le lecteur ait lu les pièces.' using errcode = '55000';
  end if;
  v_max := case when p_type = 'prelecture' then 60 else 200 end;
  if cardinality(v_pieces) > v_max then
    raise exception 'Au plus % pièces pour ce type d''analyse (% demandées) : choisissez-les.', v_max, cardinality(v_pieces)
      using errcode = '22023';
  end if;

  execute 'select a.id from public.analyses a where a.client_id = $1 and a.module = ''tamila'' and a.objet_type = ''tamila_dossier''
             and a.objet_id = $2 and a.type = $3 and a.statut in (''demandee'', ''en_cours'') order by a.demandee_le desc limit 1'
    into v_id using v_d.client_id, p_dossier::text, v_type;
  if v_id is not null then
    return v_id;
  end if;

  execute 'select private.demander_analyse($1, ''tamila'', ''tamila_dossier'', $2, $3, $4, ''dossier:v1'', $5)'
    into v_id using v_d.client_id, p_dossier::text, v_type, v_pieces, v_uid;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.analyse.demandee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('analyse', v_id, 'type', v_type, 'pieces', cardinality(v_pieces), 'par', v_uid));
  return v_id;
end $function$;

create or replace function public.tamila_demander_analyse(p_dossier uuid, p_type text, p_pieces uuid[] default null) returns uuid
language sql set search_path to '' as $function$ select private.tamila_demander_analyse(p_dossier, p_type, p_pieces) $function$;

revoke execute on function private.tamila_demander_analyse(uuid, text, uuid[]) from public;
revoke execute on function public.tamila_demander_analyse(uuid, text, uuid[]) from public, anon;
grant execute on function private.tamila_demander_analyse(uuid, text, uuid[]) to authenticated;
grant execute on function public.tamila_demander_analyse(uuid, text, uuid[]) to authenticated;

-- Une analyse Tamila ne se lit que par qui voit le dossier, murailles comprises.
do $p$
begin
  if to_regclass('public.analyses') is not null
     and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'analyses'
                       and policyname = 'tamila : qui voit le dossier, et lui seul') then
    create policy "tamila : qui voit le dossier, et lui seul" on public.analyses as restrictive for select to authenticated
      using (module <> 'tamila' or private.tamila_voit_dossier_pour((select auth.uid()), client_id, objet_id));
  end if;
end $p$;
