-- 20261022193342 c3_38_astreinte_suivi
-- Source : dépôt : 83830b47e968755ba9f2e157dc4ee282dfd2c152 omega/modules/reput/migrations/c3_38_astreinte_suivi.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_38_astreinte_suivi.sql @ 83830b47e968755ba9f2e157dc4ee282dfd2c152.
-- ═══ omega/modules/reput/migrations/c3_38_astreinte_suivi.sql @ 83830b47e968755ba9f2e157dc4ee282dfd2c152
-- c3_38 — REPUT, écarts TREPUT-13 et TREPUT-14 (T-REPUT, 22/10) : le gérant suit les appels d'astreinte ; le refus d'une
-- garde à l'envers dit le constat (session C3, 22/10/2026)
--
--   · TREPUT-13 : vue public.reput_astreinte_suivi (security_invoker : la RLS de reput_appels et reput_demandes
--     s'applique à qui la lit — membres du périmètre) : un appel par ligne — demande, client (nom affiché), rang, membre
--     appelé, état en clair, heures ; JAMAIS le numéro de garde ni le contenu de la demande. La porte de l'ouvrier
--     reput_appels_a_passer reste au serveur (elle marque les appels « en cours »).
--   · TREPUT-14 : public.reput_poser_garde (reprise de c3_37) : « La fin de la garde (…) est avant son début (…). » ;
--     même instant → « La garde commence et finit au même moment (…) : elle ne dure pas. »
--
-- Règles de pose : create or replace (vue, fonction) ; ni DROP ni DELETE.

create or replace view public.reput_astreinte_suivi with (security_invoker = true) as
select a.id as appel, a.client_id, a.entite_id, a.demande_id, d.de_nom, d.recu_le as demande_recue_le,
       a.rang, a.user_id as membre, a.statut,
       case a.statut when 'a_appeler' then 'À appeler' when 'en_cours' then 'Appel en cours' when 'sonne' then 'Ça sonne'
                     when 'pris' then 'Pris en charge' when 'sans_reponse' then 'Sans réponse : rang suivant'
                     when 'echec' then 'Appel en échec' when 'clos' then 'Clos (urgence prise)'
                     when 'sans_garde' then 'Aucune garde en cours' else a.statut end as etat,
       a.cree_le, a.essai_le, a.issue_le, d.urgence_prise_le, d.astreinte_epuisee_le
from public.reput_appels a
join public.reput_demandes d on d.id = a.demande_id;

revoke all on public.reput_astreinte_suivi from anon, authenticated;
grant select on public.reput_astreinte_suivi to authenticated, service_role;

-- TREPUT-14 (reprise de c3_37).
create or replace function public.reput_poser_garde(p_client uuid, p_entite uuid, p_membre uuid, p_telephone text,
                                                    p_du timestamptz, p_au timestamptz, p_rang integer default 1)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_role text; v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.()-]', '', 'g');
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  -- c3_37 (TREPUT-10) : chaque refus dit ce qui manque, au lieu de l'erreur brute d'une contrainte.
  if p_membre is null then
    raise exception 'Choisissez le membre de garde.' using errcode = '22023';
  end if;
  select c.role into v_role from public.comptes c where c.client_id = p_client and c.user_id = p_membre;
  if v_role is null then
    raise exception 'Ce membre n''appartient pas à l''organisation : invitez-le d''abord (Équipe), puis posez sa garde.' using errcode = '22023';
  elsif v_role = 'lecteur' then
    raise exception 'Ce membre est lecteur : il ne traite pas les demandes. Donnez-lui un rôle de collaborateur ou plus pour sa garde.' using errcode = '22023';
  elsif not private.perimetre_couvre(p_membre, p_client, p_entite) then
    raise exception 'Le périmètre de ce membre ne couvre pas ce site : élargissez-le, ou posez la garde sur un site qu''il couvre.' using errcode = '22023';
  end if;
  if v_tel ~ '^0[1-9][0-9]{8}$' then v_tel := '+33' || substr(v_tel, 2); end if;
  if v_tel !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Numéro de garde illisible (« % ») : un numéro français (06 12 34 56 78) ou international (+32…).', left(coalesce(p_telephone, ''), 40)
      using errcode = '22023';
  end if;
  if p_du is null or p_au is null then
    raise exception 'La garde a un début et une fin.' using errcode = '22023';
  elsif p_au < p_du then
    raise exception 'La fin de la garde (%) est avant son début (%).', to_char(p_au, 'DD/MM/YYYY HH24:MI'), to_char(p_du, 'DD/MM/YYYY HH24:MI')
      using errcode = '22023';
  elsif p_au = p_du then
    raise exception 'La garde commence et finit au même moment (%) : elle ne dure pas.', to_char(p_du, 'DD/MM/YYYY HH24:MI')
      using errcode = '22023';
  end if;
  if coalesce(p_rang, 1) not between 1 and 5 then
    raise exception 'Rang de garde : de 1 (appelé d''abord) à 5.' using errcode = '22023';
  end if;
  insert into public.reput_gardes (client_id, entite_id, user_id, telephone, du, au, rang, cree_par)
  values (p_client, p_entite, p_membre, v_tel, p_du, p_au, coalesce(p_rang, 1), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.garde_posee', 'reput_gardes', v_id::text,
    jsonb_build_object('entite', p_entite, 'membre', p_membre, 'du', p_du, 'au', p_au, 'rang', coalesce(p_rang, 1)), p_entite);
  return jsonb_build_object('garde', v_id);
end $function$;
