-- recupere 20261005140100 socle_lot18b_portes_reception
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête c41f468b-e5bd-442d-82de-d9c7e38b64f8 (mcp__Supabase__execute_sql, 2026-10-05T16:03:37.544Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 18b : les portes de réception.
create or replace function private.resoudre_boite(p_canal text, p_boite text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare x public.expediteurs;
begin
  perform private.exiger_ouvrier();
  if p_canal is null or p_boite is null then return null; end if;
  select * into x from public.expediteurs e
   where e.canal = p_canal
     and (lower(e.identite) = lower(p_boite) or e.parametres ->> 'phone_number_id' = p_boite)
   order by (e.statut = 'actif') desc, e.maj_le desc limit 1;
  if x.id is null then return null; end if;
  return jsonb_build_object('client_id', x.client_id, 'entite_id', null, 'module', x.module, 'expediteur_id', x.id);
end $$;
create or replace function public.resoudre_boite(p_canal text, p_boite text)
returns jsonb language sql stable set search_path to '' as $$
  select private.resoudre_boite(p_canal, p_boite)
$$;

create or replace function private.deposer_reception(
  p_client uuid, p_canal text, p_boite text, p_identifiant text,
  p_de text default null, p_de_nom text default null, p_sujet text default null,
  p_corps text default null, p_corps_html text default null,
  p_pieces jsonb default '[]'::jsonb, p_detail jsonb default '{}'::jsonb,
  p_recu_le timestamptz default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint; v_module text; v_entite uuid; v_reponse uuid; v_boite jsonb;
begin
  perform private.exiger_ouvrier();
  if p_client is null or p_canal is null or p_boite is null or p_identifiant is null then
    raise exception 'Réception incomplète : client, canal, boîte et identifiant externe sont obligatoires.' using errcode = '22023';
  end if;
  if p_canal not in ('email', 'whatsapp', 'sms', 'formulaire') then
    raise exception 'Canal inconnu : email, whatsapp, sms ou formulaire.' using errcode = '22023';
  end if;
  select id into v_id from public.receptions
   where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  v_boite := private.resoudre_boite(p_canal, p_boite);
  v_module := coalesce(p_detail ->> 'module', v_boite ->> 'module');
  v_entite := nullif(p_detail ->> 'entite_id', '')::uuid;
  -- Réponse à un envoi : par l'identifiant de message cité (detail.en_reponse_a = reference_externe) ou par l'uuid.
  if p_detail ? 'envoi_id' then
    v_reponse := nullif(p_detail ->> 'envoi_id', '')::uuid;
  elsif p_detail ? 'en_reponse_a' then
    select e.id into v_reponse from public.envois e
     where e.client_id = p_client and e.reference_externe = p_detail ->> 'en_reponse_a'
     order by e.cree_le desc limit 1;
  end if;
  insert into public.receptions (client_id, entite_id, module, canal, boite, identifiant_externe,
    de_adresse, de_empreinte, de_nom, sujet, corps, corps_html, pieces, detail, en_reponse_a, fil, langue, recu_le)
  values (p_client, v_entite, v_module, p_canal, p_boite, p_identifiant,
    p_de, case when p_de is null then null else encode(extensions.digest(lower(trim(p_de)), 'sha256'), 'hex') end,
    left(p_de_nom, 200), left(p_sujet, 1000), p_corps, p_corps_html,
    coalesce(p_pieces, '[]'::jsonb), coalesce(p_detail, '{}'::jsonb) - 'envoi_id' - 'en_reponse_a',
    v_reponse, p_detail ->> 'fil', p_detail ->> 'langue', coalesce(p_recu_le, now()))
  on conflict (client_id, canal, identifiant_externe) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.receptions
     where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  perform private.publier_evenement(p_client, 'reception.nouvelle',
    jsonb_build_object('reception', v_id, 'canal', p_canal, 'module', v_module, 'en_reponse_a', v_reponse),
    'reception:' || v_id);
  return jsonb_build_object('id', v_id, 'nouvelle', true);
end $$;
create or replace function public.deposer_reception(
  p_client uuid, p_canal text, p_boite text, p_identifiant text,
  p_de text default null, p_de_nom text default null, p_sujet text default null,
  p_corps text default null, p_corps_html text default null,
  p_pieces jsonb default '[]'::jsonb, p_detail jsonb default '{}'::jsonb,
  p_recu_le timestamptz default null)
returns jsonb language sql set search_path to '' as $$
  select private.deposer_reception(p_client, p_canal, p_boite, p_identifiant, p_de, p_de_nom, p_sujet, p_corps, p_corps_html, p_pieces, p_detail, p_recu_le)
$$;
revoke all on function public.resoudre_boite(text, text) from public, anon, authenticated;
revoke all on function public.deposer_reception(uuid, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.resoudre_boite(text, text) to service_role;
grant execute on function public.deposer_reception(uuid, text, text, text, text, text, text, text, text, jsonb, jsonb, timestamptz) to service_role;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005140100', 'socle_lot18b_portes_reception', array['-- posé par execute_sql : resoudre_boite, deposer_reception (private + public, service_role)']);
select to_regprocedure('public.deposer_reception(uuid,text,text,text,text,text,text,text,text,jsonb,jsonb,timestamptz)') as deposer, to_regprocedure('public.resoudre_boite(text,text)') as resoudre;
