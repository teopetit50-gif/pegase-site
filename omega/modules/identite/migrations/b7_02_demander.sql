-- IDENTITÉ DES TIERS (B7), lot 2 — demander une vérification soi-même.
--
-- Ce que ce lot pose :
--   private.identite_deposer_travail(v)       (remplacée) : porte « force » de la demande dans la charge du travail ;
--   public.identite_demander(...)             porte : une personne de l'organisation (« revérifier maintenant »), ou un
--                                             autre module par le service, demande la vérification d'un SIREN ou d'un
--                                             numéro de TVA ; avec p_force, l'ouvrier ignore le cache de trente jours.
-- Dépend de b7_01. Migration idempotente ; aucun DROP, aucun DELETE.

-- La demande forcée se dit dans la preuve de la ligne ouverte ({"force": true}) : la preuve est réécrite à la réponse.
create or replace function private.identite_deposer_travail(p_v public.filed_verifications_tiers) returns bigint
language plpgsql set search_path to '' as $$
declare v_charge jsonb;
begin
  if p_v.repondu_le is not null then return null; end if;
  v_charge := jsonb_build_object('verification', p_v.id, 'registre', p_v.registre, 'identifiant', p_v.identifiant, 'fournisseur', p_v.fournisseur_id);
  if coalesce((p_v.preuve ->> 'force')::boolean, false) then
    v_charge := v_charge || '{"force": true}'::jsonb;
  end if;
  return private.deposer_travail(p_v.client_id, 'filed', 'identite.verifier', v_charge, 'verification:' || p_v.id::text, 0::smallint);
end $$;

-- Demander une vérification. Rend l'id de la demande ouverte (la demande déjà ouverte pour le même identifiant, s'il y en a une).
--   p_registre : 'sirene' (SIREN, 9 chiffres) ou 'vies' (numéro de TVA de l'Union) ; p_identifiant est normalisé ;
--   p_fournisseur : la fiche FILED à laquelle rattacher la réponse (doit être du client) ;
--   p_force : ignorer le cache de trente jours (« revérifier maintenant »).
-- Qui : une personne de l'organisation (gérant, admin, valideur, collaborateur), ou le service.
create or replace function public.identite_demander(p_client uuid, p_registre text, p_identifiant text, p_fournisseur uuid default null, p_force boolean default false)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_ident text := private.identite_normaliser(p_identifiant);
  v_id uuid;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  if p_registre not in ('sirene', 'vies') then
    raise exception 'Registre inconnu : % (sirene ou vies).', p_registre using errcode = '22023';
  end if;
  if v_ident is null then
    raise exception 'Identifiant vide.' using errcode = '22023';
  end if;
  if p_registre = 'sirene' and v_ident !~ '^[0-9]{9}$' then
    raise exception 'Un SIREN a neuf chiffres.' using errcode = '22023';
  end if;
  if p_registre = 'vies' and v_ident !~ '^[A-Z]{2}[A-Z0-9]{2,13}$' then
    raise exception 'Un numéro de TVA de l''Union commence par deux lettres.' using errcode = '22023';
  end if;
  if p_fournisseur is not null and not exists (select 1 from public.filed_fournisseurs f where f.id = p_fournisseur and f.client_id = p_client) then
    raise exception 'Fournisseur inconnu dans cette organisation.' using errcode = 'P0002';
  end if;
  select v.id into v_id from public.filed_verifications_tiers v
   where v.client_id = p_client and v.registre = p_registre and v.identifiant = v_ident and v.repondu_le is null
   order by v.demande_le desc limit 1;
  if v_id is not null then
    if p_force then
      update public.filed_verifications_tiers set preuve = preuve || '{"force": true}'::jsonb where id = v_id;
      update public.travaux set charge = charge || '{"force": true}'::jsonb
       where cle = 'verification:' || v_id::text and genre = 'identite.verifier' and etat in ('a_faire', 'en_cours');
    end if;
    return v_id;
  end if;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
  values (p_client, p_fournisseur, p_registre, v_ident, case when p_force then '{"force": true}'::jsonb else '{}'::jsonb end)
  returning id into v_id;
  return v_id;
end $$;
comment on function public.identite_demander(uuid, text, text, uuid, boolean) is
  'Demander la vérification d''un SIREN (sirene) ou d''un numéro de TVA (vies) : une personne de l''organisation ou le service. p_force ignore le cache de trente jours. Rend l''id de la demande ouverte ; l''ouvrier identite y répond.';
revoke all on function public.identite_demander(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.identite_demander(uuid, text, text, uuid, boolean) to authenticated, service_role;
