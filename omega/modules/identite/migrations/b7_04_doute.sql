-- IDENTITÉ DES TIERS (B7), lot 4 — un refus isolé de VIES n'est pas un verdict.
--
-- Le cas réel (recette, 6/10, 13 h 48 → 13 h 54 Z) : ORANGE SA, FR89380129866, VIES « valide » puis, six minutes
-- plus tard, « invalide ». VIES rend valid:false quand la base d'un État membre flanche ; le verdict valide du
-- fournisseur a été écrasé par ce faux refus. Ce lot pose deux règles, tenues en SQL pour que tout écrivain y passe :
--
--   1. Un refus est DOUTEUX quand le même identifiant a une réponse valide de moins de 30 jours (cache global ou
--      vérification, tous clients : le registre est public), ou quand l'ouvrier l'a marqué « suspect » (preuve
--      `suspect`, posée pour un numéro de TVA FR à clé juste dont le SIREN est actif à Sirene).
--   2. Un refus douteux ne conclut que s'il CONFIRME un refus antérieur d'au moins une heure (deux réponses négatives
--      espacées d'au moins 1 h, sans réponse valide entre les deux). Sinon la réponse est écrite « indisponible » avec
--      `preuve.doute` {motif, premier_refus_le, rang, valide_le} : pas de verdict, pas de recontrôle, le cache garde
--      la réponse valide, et identite_relancer redemande (forcé, sans cache) 1 h après le premier doute, 6 h ensuite.
-- Une réponse servie par le cache (source 'cache') n'est jamais retenue : elle redit ce qu'un registre a déjà dit.
--
-- Ce que ce lot pose :
--   private.identite_doute(registre, identifiant, preuve) → jsonb|null      la règle (null = le refus conclut) ;
--   private.identite_memoriser(...)          (remplacée) : un « indisponible » n'écrase plus une réponse du registre ;
--   public.noter_identite(...)               (remplacée) : applique la règle à la réponse et aux compléments ; rend
--                                            en plus `resultat` (celui écrit) et `doute` (booléen) ;
--   public.identite_relancer(p_heures)       (remplacée) : un doute est redemandé forcé, à 1 h puis 6 h ;
--   rattrapage : les refus VIES déjà écrits sous l'ancienne règle (clé juste, SIREN actif, 30 jours, remarque
--                « non assujetti probable ») sont redemandés une fois, forcés.
-- Dépend de b7_01, b7_02 (la force passe de la preuve à la charge du travail). Rejouable ; rien n’est supprimé.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. La règle
-- ───────────────────────────────────────────────────────────────────────────
-- Rend null si un refus pour (registre, identifiant) peut conclure ; sinon l'objet `doute` à poser dans la preuve.
create or replace function private.identite_doute(p_registre text, p_identifiant text, p_preuve jsonb) returns jsonb
language plpgsql stable set search_path to '' as $$
declare
  v_ident text := private.identite_normaliser(p_identifiant);
  v_valide_le timestamptz;
  v_premier timestamptz;
  v_rang integer;
  v_suspect boolean := coalesce(p_preuve, '{}'::jsonb) ? 'suspect';
begin
  select max(d) into v_valide_le from (
    select r.verifie_le as d from public.identites_registre r
     where r.registre = p_registre and r.identifiant = v_ident and r.resultat = 'valide' and r.verifie_le > now() - interval '30 days'
    union all
    select v.repondu_le from public.filed_verifications_tiers v
     where v.registre = p_registre and v.identifiant = v_ident and v.resultat = 'valide' and v.repondu_le > now() - interval '30 days'
  ) x;
  if v_valide_le is null and not v_suspect then
    return null;
  end if;
  -- La série de refus en cours : depuis la dernière réponse valide (ou sur 30 jours), les refus et les doutes.
  select min(v.repondu_le), count(*) filter (where v.preuve ? 'doute') into v_premier, v_rang
    from public.filed_verifications_tiers v
   where v.registre = p_registre and v.identifiant = v_ident and v.repondu_le is not null
     and v.repondu_le > coalesce(v_valide_le, now() - interval '30 days')
     and (v.resultat = 'invalide' or (v.resultat = 'indisponible' and v.preuve ? 'doute'));
  if v_premier is not null and v_premier <= now() - interval '1 hour' then
    return null;
  end if;
  return jsonb_build_object(
    'motif', case when v_valide_le is not null
                  then 'Refus du registre alors qu''une réponse valide a moins de 30 jours : à confirmer par un second refus, au moins une heure plus tard.'
                  else 'Refus du registre pour un numéro à clé juste dont le SIREN est actif : à confirmer par un second refus, au moins une heure plus tard.' end,
    'premier_refus_le', coalesce(v_premier, now()),
    'rang', coalesce(v_rang, 0) + 1,
    'valide_le', v_valide_le);
end $$;
comment on function private.identite_doute(text, text, jsonb) is
  'Règle B7 : un refus de registre ne conclut pas s''il contredit une réponse valide de moins de 30 jours (ou s''il est marqué suspect par l''ouvrier) sans confirmer un refus d''au moins une heure. Rend l''objet doute, ou null si le refus conclut.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le cache : « indisponible » n'écrase pas une réponse du registre
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.identite_memoriser(p_registre text, p_identifiant text, p_resultat text, p_preuve jsonb, p_source text, p_version text)
returns void language plpgsql set search_path to '' as $$
begin
  if p_source = 'cache' then return; end if;
  insert into public.identites_registre (registre, identifiant, resultat, preuve, source, version, verifie_le)
  values (p_registre, private.identite_normaliser(p_identifiant), p_resultat, coalesce(p_preuve, '{}'::jsonb), p_source, left(p_version, 40), now())
  on conflict (registre, identifiant) do update
    set resultat = excluded.resultat, preuve = excluded.preuve, source = excluded.source, version = excluded.version, verifie_le = now()
    where excluded.resultat <> 'indisponible' or public.identites_registre.resultat = 'indisponible';
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. La porte de réponse, avec la règle
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.noter_identite(p_verification uuid, p_resultat text, p_preuve jsonb, p_source text, p_complements jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v public.filed_verifications_tiers;
  c jsonb;
  v_version text := coalesce(p_preuve ->> 'verifie_par', null);
  v_res text := p_resultat;
  v_preuve jsonb := coalesce(p_preuve, '{}'::jsonb);
  v_doute jsonb;
  n_compl integer := 0;
  n_recontrolees integer := 0;
  v_registre text;
  v_ident text;
  v_resultat text;
  v_cpreuve jsonb;
begin
  if p_resultat not in ('valide', 'invalide', 'indisponible') then
    raise exception 'Résultat inconnu : %', p_resultat using errcode = '22023';
  end if;
  if coalesce(p_source, '') = '' then
    raise exception 'Source obligatoire (sirene, recherche-entreprises, vies, cache).' using errcode = '22023';
  end if;
  select * into v from public.filed_verifications_tiers where id = p_verification for update;
  if not found then
    raise exception 'Vérification inconnue : %', p_verification using errcode = 'P0002';
  end if;
  if v.repondu_le is not null then
    return jsonb_build_object('verification', v.id, 'deja_repondue', true, 'complements', 0, 'recontrolees', 0,
                              'resultat', v.resultat, 'doute', v.preuve ? 'doute');
  end if;

  -- Un refus douteux devient « indisponible » : pas de verdict, pas de recontrôle, une relance forcée plus tard.
  if v_res = 'invalide' and p_source <> 'cache' then
    v_doute := private.identite_doute(v.registre, v.identifiant, v_preuve);
    if v_doute is not null then
      v_res := 'indisponible';
      v_preuve := v_preuve || jsonb_build_object('doute', v_doute, 'resultat_registre', 'invalide');
    end if;
  end if;

  perform private.filed_repondre_verification(v.id, v_res, v_preuve || jsonb_build_object('source', p_source));
  perform private.identite_memoriser(v.registre, v.identifiant, v_res, v_preuve, p_source, v_version);

  -- Les compléments : ce que l'ouvrier a vérifié en plus (Sirene sur le SIREN que porte une TVA FR, par exemple).
  for c in select * from jsonb_array_elements(coalesce(p_complements, '[]'::jsonb)) loop
    v_registre := c ->> 'registre';
    v_ident := private.identite_normaliser(c ->> 'identifiant');
    v_resultat := c ->> 'resultat';
    v_cpreuve := coalesce(c -> 'preuve', '{}'::jsonb);
    if v_registre not in ('sirene', 'vies') or v_ident is null or v_resultat not in ('valide', 'invalide', 'indisponible') then
      continue;
    end if;
    if v_resultat = 'invalide' and coalesce(c ->> 'source', p_source) <> 'cache' then
      v_doute := private.identite_doute(v_registre, v_ident, v_cpreuve);
      if v_doute is not null then
        v_resultat := 'indisponible';
        v_cpreuve := v_cpreuve || jsonb_build_object('doute', v_doute, 'resultat_registre', 'invalide');
      end if;
    end if;
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
    values (v.client_id, v.fournisseur_id, v_registre, v_ident, now(), now(), v_resultat,
            v_cpreuve || jsonb_build_object('source', coalesce(c ->> 'source', p_source), 'complement_de', v.id));
    perform private.identite_memoriser(v_registre, v_ident, v_resultat, v_cpreuve, coalesce(c ->> 'source', p_source), v_version);
    n_compl := n_compl + 1;
  end loop;

  select * into v from public.filed_verifications_tiers where id = p_verification;
  if v_res <> 'indisponible' then
    perform private.identite_poser_verdict(v, v_res, p_source);
    n_recontrolees := private.identite_recontroler(v);
  end if;
  return jsonb_build_object('verification', v.id, 'deja_repondue', false, 'complements', n_compl, 'recontrolees', n_recontrolees,
                            'resultat', v_res, 'doute', v_res <> p_resultat);
end $$;
comment on function public.noter_identite(uuid, text, jsonb, text, jsonb) is
  'Porte de l''ouvrier identite : la réponse d''un registre pour une vérification demandée, le cache global, les vérifications complémentaires, puis le recontrôle des factures concernées. Un refus douteux (private.identite_doute) est écrit « indisponible » avec preuve.doute. Idempotente. Réservée au service.';
revoke all on function public.noter_identite(uuid, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.noter_identite(uuid, text, jsonb, text, jsonb) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. La relance : un doute est redemandé forcé, 1 h après le premier, 6 h ensuite
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.identite_relancer(p_heures integer default 2) returns integer
language plpgsql security definer set search_path to '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select v.* from public.filed_verifications_tiers v
    where v.resultat = 'indisponible'
      and v.repondu_le < now() - case when not v.preuve ? 'doute' then make_interval(hours => greatest(p_heures, 1))
                                      when coalesce((v.preuve -> 'doute' ->> 'rang')::int, 1) <= 1 then interval '1 hour'
                                      else interval '6 hours' end
      and not exists (select 1 from public.filed_verifications_tiers w
                      where w.client_id = v.client_id and w.registre = v.registre and w.identifiant = v.identifiant
                        and (w.repondu_le is null or w.repondu_le > v.repondu_le))
  loop
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
    values (r.client_id, r.fournisseur_id, r.registre, r.identifiant,
            case when r.preuve ? 'doute' then jsonb_build_object('force', true, 'origine', 'doute', 'relance_de', r.id) else '{}'::jsonb end);
    n := n + 1;
  end loop;
  return n;
end $$;
comment on function public.identite_relancer(integer) is
  'Porte de l''ouvrier identite : rouvre une demande pour chaque vérification restée « indisponible » depuis plus de p_heures sans réponse plus récente ; un refus douteux (preuve.doute) est redemandé forcé 1 h après le premier doute, 6 h ensuite. Réservée au service.';
revoke all on function public.identite_relancer(integer) from public, anon, authenticated;
grant execute on function public.identite_relancer(integer) to service_role;

revoke all on function private.identite_doute(text, text, jsonb) from public, anon, authenticated;
grant execute on function private.identite_doute(text, text, jsonb) to service_role;
grant execute on function private.identite_memoriser(text, text, text, jsonb, text, text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Rattrapage : les refus VIES écrits sous l'ancienne règle sont redemandés une fois
-- ───────────────────────────────────────────────────────────────────────────
-- Refus VIES de moins de 30 jours, clé de TVA juste, SIREN actif à Sirene (la remarque de l'ancienne règle), sans
-- réponse ni demande plus récente pour (client, identifiant) : une demande forcée, que l'ouvrier traitera sous la
-- nouvelle règle. Rejouer ce lot ne redemande rien de plus (la demande ouverte, puis sa réponse, sont plus récentes).
insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
select v.client_id, v.fournisseur_id, v.registre, v.identifiant,
       jsonb_build_object('force', true, 'origine', 'rattrapage_b7_04', 'relance_de', v.id)
  from public.filed_verifications_tiers v
 where v.registre = 'vies' and v.resultat = 'invalide' and v.repondu_le > now() - interval '30 days'
   and v.preuve ->> 'remarque' like 'SIREN actif à Sirene, numéro de TVA non reconnu par VIES%'
   and v.preuve -> 'coherence' ->> 'cle_ok' = 'true'
   and not exists (select 1 from public.filed_verifications_tiers w
                    where w.client_id = v.client_id and w.registre = v.registre and w.identifiant = v.identifiant
                      and (w.repondu_le is null or w.repondu_le > v.repondu_le));
