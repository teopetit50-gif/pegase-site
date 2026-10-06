-- IDENTITÉ DES TIERS (B7), lot 6 — les fournisseurs suisses et britanniques.
--
-- À poser APRÈS le lot d'A4 qui élargit les trois contraintes (registre de filed_verifications_tiers et
-- d'identites_registre, identite_source de filed_fournisseurs) à `uid_ch` (registre IDE suisse) et `hmrc` (TVA GB).
-- L'ouvrier sait déjà les consulter (worker-b7 9b8fb62, coquille v5).
--
-- Ce que ce lot pose :
--   private.identite_cible_etrangere(p_tva, p_id_etranger) → (registre, identifiant)   la vérification d'un
--     fournisseur hors Union : une TVA suisse `CHE…` → uid_ch avec le suffixe MWST (on vérifie l'inscription à la
--     TVA) ; une TVA `GB…` (9 ou 12 chiffres) → hmrc ; sinon une IDE suisse en id_etranger → uid_ch (l'entreprise
--     seule) ; sinon rien. XI (Irlande du Nord) reste à VIES ;
--   public.identite_demander(...)  (remplacée, texte de b7_02) : admet `uid_ch` (CHE + 9 chiffres, suffixe MWST, TVA
--     ou IVA facultatif) et `hmrc` (GB + 9 ou 12 chiffres) ;
--   public.identite_balayer(...)   (remplacée, texte de b7_03) : revérifie aussi les fournisseurs suisses et
--     britanniques (VIES d'abord si la TVA est de l'Union, puis le registre étranger, puis Sirene).
-- Le verdict (identite_poser_verdict, b7_01) pose le registre comme identite_source : uid_ch ou hmrc.
-- Dépend de b7_01, b7_02, b7_03 et du lot d'A4 sur les contraintes. Rejouable ; rien n'est supprimé.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Quel registre pour un fournisseur hors Union
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.identite_cible_etrangere(p_tva text, p_id_etranger text default null,
  out registre text, out identifiant text)
language plpgsql immutable set search_path to '' as $$
declare
  v_tva text := private.identite_normaliser(p_tva);
  v_autre text := private.identite_normaliser(p_id_etranger);
begin
  if v_tva ~ '^CHE[0-9]{9}(MWST|TVA|IVA)?$' then
    -- Une TVA suisse : on vérifie l'inscription à la TVA (suffixe), pas seulement l'entreprise.
    registre := 'uid_ch';
    identifiant := substr(v_tva, 1, 12) || coalesce(nullif(substr(v_tva, 13), ''), 'MWST');
  elsif v_tva ~ '^GB([0-9]{9}|[0-9]{12})$' then
    registre := 'hmrc';
    identifiant := v_tva;
  elsif v_autre ~ '^CHE[0-9]{9}(MWST|TVA|IVA)?$' then
    registre := 'uid_ch';
    identifiant := v_autre;
  end if;
end $$;
comment on function private.identite_cible_etrangere(text, text) is
  'B7 : le registre et l''identifiant qui vérifient un fournisseur hors Union (uid_ch pour une IDE ou une TVA suisse, hmrc pour une TVA GB), ou rien.';
revoke all on function private.identite_cible_etrangere(text, text) from public, anon, authenticated;
grant execute on function private.identite_cible_etrangere(text, text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Demander : les deux registres étrangers en plus (texte de b7_02)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.identite_demander(p_client uuid, p_registre text, p_identifiant text, p_fournisseur uuid default null, p_force boolean default false)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_ident text := private.identite_normaliser(p_identifiant);
  v_id uuid;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  if p_registre not in ('sirene', 'vies', 'uid_ch', 'hmrc') then
    raise exception 'Registre inconnu : % (sirene, vies, uid_ch ou hmrc).', p_registre using errcode = '22023';
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
  if p_registre = 'uid_ch' and v_ident !~ '^CHE[0-9]{9}(MWST|TVA|IVA)?$' then
    raise exception 'Une IDE suisse s''écrit CHE puis neuf chiffres (suffixe MWST, TVA ou IVA pour la TVA).' using errcode = '22023';
  end if;
  if p_registre = 'hmrc' and v_ident !~ '^GB([0-9]{9}|[0-9]{12})$' then
    raise exception 'Un numéro de TVA britannique s''écrit GB puis 9 ou 12 chiffres (XI passe par VIES).' using errcode = '22023';
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
  'Demander la vérification d''un SIREN (sirene), d''un numéro de TVA de l''Union (vies), d''une IDE ou TVA suisse (uid_ch) ou d''une TVA britannique (hmrc) : une personne de l''organisation ou le service. p_force ignore le cache de trente jours. Rend l''id de la demande ouverte ; l''ouvrier identite y répond.';
revoke all on function public.identite_demander(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.identite_demander(uuid, text, text, uuid, boolean) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Balayer : les fournisseurs suisses et britanniques aussi (texte de b7_03)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.identite_balayer(p_jours integer default 90, p_max integer default 50) returns integer
language plpgsql security definer set search_path to '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    with cibles as (
      select f.id as fournisseur_id, f.client_id,
             case when a.valide then 'vies'
                  when e.registre is not null then e.registre
                  when private.identite_normaliser(f.siren) ~ '^[0-9]{9}$'
                    and private.filed_siren_valide(private.identite_normaliser(f.siren)) then 'sirene'
                  end as registre,
             case when a.valide then private.identite_normaliser(f.tva)
                  when e.registre is not null then e.identifiant
                  else private.identite_normaliser(f.siren) end as identifiant
      from public.filed_fournisseurs f
      left join lateral private.filed_tva_intracom_analyser(f.tva) a on true
      left join lateral private.identite_cible_etrangere(f.tva, f.id_etranger) e on true
      where f.statut in ('actif', 'a_confirmer')
    ),
    datees as (
      select c.*,
             (select max(v.repondu_le) from public.filed_verifications_tiers v
               where v.client_id = c.client_id and v.registre = c.registre and v.identifiant = c.identifiant
                 and v.repondu_le is not null) as derniere
      from cibles c
      where c.registre is not null
    )
    select d.* from datees d
    where (d.derniere is null or d.derniere < now() - make_interval(days => greatest(p_jours, 1)))
      and not exists (select 1 from public.filed_verifications_tiers o
                      where o.client_id = d.client_id and o.registre = d.registre and o.identifiant = d.identifiant
                        and o.repondu_le is null)
    order by d.derniere nulls first, d.fournisseur_id
    limit greatest(least(p_max, 500), 0)
  loop
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
    values (r.client_id, r.fournisseur_id, r.registre, r.identifiant, '{"origine": "balayage"}'::jsonb);
    n := n + 1;
  end loop;
  return n;
end $$;
comment on function public.identite_balayer(integer, integer) is
  'Porte de l''ouvrier identite : ouvre une demande de vérification pour chaque fournisseur actif ou à confirmer dont la dernière réponse de registre a plus de p_jours (ou n''existe pas), p_max au plus par appel, les plus anciens d''abord. VIES pour une TVA de l''Union, uid_ch ou hmrc pour un fournisseur suisse ou britannique, Sirene sinon. Réservée au service.';
revoke all on function public.identite_balayer(integer, integer) from public, anon, authenticated;
grant execute on function public.identite_balayer(integer, integer) to service_role;
