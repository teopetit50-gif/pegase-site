-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_32 : une relance validée sans envoi réglé se note envoyée à la main (21/10/2026, session C2 — TCASHD-15)
-- ═══════════════════════════════════════════════════════════════════════════
-- Sans réglage d'envoi CASHD (le client envoie lui-même), une relance reste « non_reglee », même approuvée :
-- cashd_noter_envoi_main la refusait (« Cette relance n'est pas à envoyer (non_reglee) »), et avec c2_24 la mise en
-- demeure restait alors retenue pour toujours (recette T-CASHD, 0cf52b47, approbation 2f7cdf9b). C'est justement le
-- cas du client qui n'envoie pas par Omega : une relance non_reglee se note désormais envoyée à la main, une fois sa
-- demande approuvée (la validation reste exigée).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE.

-- Noter un envoi à la main (c2_11) : une relance non_reglee aussi.
create or replace function public.cashd_noter_envoi_main(p_relance uuid, p_canal text default 'email', p_le timestamptz default null, p_note text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare r public.cashd_relances; v_uid uuid; v_dstatut text; v_le timestamptz := coalesce(p_le, now()); x public.cashd_envois_main;
begin
  select * into r from public.cashd_relances where id = p_relance;
  if not found then
    raise exception 'Relance introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(r.client_id, r.entite_id);
  if coalesce(p_canal, '') not in ('email', 'courrier', 'telephone', 'autre') then
    raise exception 'Le canal : email, courrier, telephone ou autre.' using errcode = '22023';
  end if;
  -- c2_32 : « non_reglee » — écrite et validée, sans envoi CASHD réglé (le client envoie lui-même) — se note aussi
  if r.statut not in ('a_valider', 'non_reglee') then
    raise exception 'Cette relance n''est pas à envoyer (%).', r.statut using errcode = '55000';
  end if;
  select d.statut into v_dstatut from public.demandes_validation d where d.id = r.demande_id;
  if v_dstatut is distinct from 'approuvee' then
    raise exception 'Une relance ne part qu''après sa validation : validez-la d''abord dans la file.' using errcode = '55000';
  end if;
  if exists (select 1 from public.envois e where e.id = r.envoi_id and e.envoye_le is not null) then
    raise exception 'Cette relance est déjà partie par Omega.' using errcode = '55000';
  end if;
  if v_le > now() + interval '5 minutes' or (v_le at time zone 'Europe/Paris')::date < r.jour then
    raise exception 'La date d''envoi tombe entre le jour où la relance a été écrite et maintenant.' using errcode = '22023';
  end if;
  insert into public.cashd_envois_main (client_id, relance_id, canal, envoye_le, note, note_par)
  values (r.client_id, r.id, p_canal, v_le, nullif(left(btrim(p_note), 500), ''), v_uid)
  on conflict (relance_id) do nothing
  returning * into x;
  if x.id is null then
    raise exception 'Cet envoi est déjà noté.' using errcode = '23505';
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_envoyee_main', 'cashd_relances', r.id::text,
    jsonb_build_object('canal', p_canal, 'envoye_le', v_le, 'destinataire', r.destinataire_adresse, 'palier', r.palier, 'montant', r.montant), r.entite_id);
  return to_jsonb(x);
end $function$;

revoke execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) to authenticated, service_role;
