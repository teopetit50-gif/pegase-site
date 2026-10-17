-- 19as_envoi_interne — socle : un message INTERNE, du serveur vers un membre de l'organisation, sans validation. A1, 17/10/2026.
-- Pour C3 (REPUT : prévenir le membre qui reprend une demande transférée) et tout module qui doit avertir son équipe.
-- preparer_envoi refuse qu'un moteur se passe de la validation (« un accord permanent peut couvrir ses envois ») ;
-- un avis à un membre de l'équipe n'a pourtant rien à faire dans « À valider ». Cette porte l'en exempte, et ne
-- laisse passer que ce qui ne peut rien dire de plus que le gabarit :
--   · le destinataire est un MEMBRE de l'organisation (public.comptes), désigné par son identifiant, jamais une adresse ;
--   · le contenu est un gabarit VALIDÉ et FERMÉ : aucune variable de type « texte » (seulement date, nombre…), donc
--     aucun texte libre ; ni sujet, ni corps, ni pièce jointe ; le gabarit est transactionnel et sans donnée de santé ;
--   · une clé d'idempotence (rejouer rend le même envoi).
-- L'envoi naît par private.creer_envoi, comme tout envoi : mêmes verrous (réglages du module, expéditeur, heures,
-- plafonds, oppositions, doublon), même expéditeur (A2). Il est marqué direct = true et prepare_par = null :
-- « décidé par le serveur, exempté de validation » ; aucune demande de validation n'est créée.
--   · private.envoyer_interne(p_client, p_module, p_objet_type, p_objet_id, p_canal, p_membre, p_gabarit, p_variables,
--     p_cle_idempotence, p_entite) → uuid de l'envoi. Appelable depuis le SQL d'un module (même quand c'est un membre
--     qui agit à l'écran : le contenu reste celui du gabarit) ; public.envoyer_interne, même signature, serveur seul.
-- Create or replace seulement ; aucune suppression ; rejouable.

create or replace function private.envoyer_interne(
  p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_membre uuid, p_gabarit text,
  p_variables jsonb default '{}'::jsonb, p_cle_idempotence text default null, p_entite uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_id uuid;
  v_dest jsonb;
  v_g public.gabarits_messages;
  v_libres text;
begin
  if nullif(btrim(p_cle_idempotence), '') is null then
    raise exception 'Une clé d''idempotence est obligatoire : rejouer ne doit jamais envoyer deux fois.' using errcode = '22023';
  end if;
  select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = btrim(p_cle_idempotence);
  if v_id is not null then
    return v_id;
  end if;
  if p_membre is null then
    raise exception 'Un envoi interne va à un membre de l''organisation, désigné par son identifiant.' using errcode = '22023';
  end if;
  if p_gabarit is null then
    raise exception 'Un envoi interne suit un gabarit validé : jamais de texte rédigé.' using errcode = '22023';
  end if;
  -- Le membre (refusé s'il n'est pas de l'organisation) et sa langue, pour choisir la version du gabarit.
  v_dest := private.resoudre_destinataire(p_client, p_canal, jsonb_build_object('membre', p_membre), p_entite);
  v_g := private.gabarit_pour(p_client, p_module, p_gabarit, v_dest ->> 'langue');
  if v_g.id is null then
    raise exception 'Aucun gabarit validé « % » pour le module %.', p_gabarit, p_module using errcode = 'P0002';
  end if;
  select string_agg(v.key, ', ' order by v.key) into v_libres
  from jsonb_each_text(v_g.variables) v where v.value = 'texte';
  if v_libres is not null then
    raise exception 'Le gabarit % n''est pas fermé : variable(s) de texte libre (%). Un envoi interne n''en porte aucune.',
      p_gabarit, v_libres using errcode = '22023';
  end if;
  if not v_g.transactionnel or v_g.donnees_sante then
    raise exception 'Un envoi interne suit un gabarit transactionnel, sans donnée de santé.' using errcode = '22023';
  end if;
  begin
    return private.creer_envoi(
      p_client, p_module, p_objet_type, p_objet_id, p_canal, jsonb_build_object('membre', p_membre), p_gabarit,
      coalesce(p_variables, '{}'::jsonb), null, null, null, btrim(p_cle_idempotence), p_entite, true, false, null,
      true, null, null, null, null, null, null);
  exception when unique_violation then
    -- Deux appels simultanés avec la même clé : le second rend le premier.
    select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = btrim(p_cle_idempotence);
    if v_id is null then
      raise;
    end if;
    return v_id;
  end;
end $$;

create or replace function public.envoyer_interne(
  p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_membre uuid, p_gabarit text,
  p_variables jsonb default '{}'::jsonb, p_cle_idempotence text default null, p_entite uuid default null)
returns uuid language plpgsql set search_path to '' as $$
begin
  perform private.exiger_ouvrier();
  return private.envoyer_interne(p_client, p_module, p_objet_type, p_objet_id, p_canal, p_membre, p_gabarit, p_variables,
                                 p_cle_idempotence, p_entite);
end $$;

comment on function public.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid) is
  'Message interne du serveur à un membre de l''organisation : gabarit validé sans variable de texte, exempté de validation (19as).';

revoke all on function private.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function private.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid) to service_role;
grant execute on function public.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid) to service_role;
