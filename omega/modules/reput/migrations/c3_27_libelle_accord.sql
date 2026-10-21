-- c3_27 — REPUT, détail d'écran de la série 1 du testeur : « Accord permanent : Accord permanent : réponses… » (session C3,
-- 21/10/2026)
--
-- Constat (demande politique.activer 3fd95f5a) : le socle compose le résumé de la demande d'activation en préfixant
-- « Accord permanent : » au libellé de la politique ; le libellé posé par REPUT commençait déjà par ces mots.
-- public.reput_donner_accord (reprise de c3_07) pose désormais un libellé sans préfixe : « Réponses « Horaires » envoyées
-- sans relecture », « Accusés de réception envoyés sans relecture ». Les accords déjà posés gardent leur libellé (aucune
-- donnée touchée).
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function public.reput_donner_accord(p_client uuid, p_sujet text, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_code text := lower(btrim(p_sujet));
  v_libelle text;
  v_ok boolean;
  v_ref text;
  v_type text;
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Un accord permanent se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if v_code in ('accuse', 'demande_avis') then
    v_libelle := case v_code when 'accuse' then 'accusés de réception' else 'demandes d''avis' end;
    v_ok := true;
    v_ref := p_client::text;
  else
    select s.libelle, s.autorisable and s.actif, s.id::text into v_libelle, v_ok, v_ref
    from public.reput_sujets s where s.client_id = p_client and s.code = v_code;
    if v_libelle is null then
      raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
    end if;
  end if;
  if not v_ok then
    raise exception 'Le sujet « % » ne peut pas partir sans relecture.', v_libelle using errcode = '42501';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  v_type := private.reput_type_accord(v_code);
  perform pg_advisory_xact_lock(hashtextextended('reput.accord:' || p_client::text || ':' || v_code, 0));
  insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, actif)
  select p_client, null, 'reput', 'politique.activer', 1, array['gerant', 'admin', 'valideur'], true
  where not exists (select 1 from public.regles_validation r
                    where r.client_id = p_client and r.module = 'reput' and r.type_action = 'politique.activer'
                      and r.entite_id is null and r.actif);
  if not exists (select 1 from public.politiques p
                 where p.client_id = p_client and p.module = 'reput' and p.type_action = v_type
                   and p.entite_id is not distinct from p_entite
                   and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days'))) then
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, p_entite, 'reput', v_type,
            -- c3_27 : le socle préfixe lui-même « Accord permanent : » dans le résumé de la demande d'activation.
            left(case when v_code in ('accuse', 'demande_avis') then v_libelle || ' envoyés sans relecture'
                      else 'Réponses « ' || v_libelle || ' » envoyées sans relecture' end, 200),
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_donne', 'reput_sujets', v_ref,
      jsonb_build_object('sujet', v_code, 'type_action', v_type, 'politique', v_id, 'entite', p_entite, 'par', v_uid), p_entite);
  end if;
  return jsonb_build_object('sujet', v_code, 'proposee', v_id, 'sujets', private.reput_accords_etat(p_client));
end $function$;
