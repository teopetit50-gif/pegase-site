-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_37 : le statut « envoyee » pour une relance notée envoyée à la main (21/10/2026, session C2 — TCASHD-17)
-- ═══════════════════════════════════════════════════════════════════════════
-- c2_34 rendait l'état « envoyee » (cashd_relances_etat) mais laissait le statut à « a_valider » (recette T-CASHD,
-- rappel de A-C19). La contrainte du statut est élargie à « envoyee » (DROP CONSTRAINT puis ADD CONSTRAINT : seul
-- DROP de cette migration, permis par le coordinateur pour élargir une contrainte CHECK) ; une relance notée envoyée à
-- la main prend ce statut, et la reprise le donne à celles déjà notées. Noter deux fois reste refusé (23505).
--
-- Règles de pose : rejouable ; aucun autre DROP, jamais de DELETE ; revoke execute de public.

alter table public.cashd_relances drop constraint if exists cashd_relances_statut_check;
alter table public.cashd_relances add constraint cashd_relances_statut_check
  check (statut in ('preparee', 'a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'coupee', 'echec', 'envoyee'));

-- Noter un envoi à la main (c2_34) : la relance prend le statut « envoyee ».
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
  if r.statut = 'envoyee' then
    raise exception 'Cet envoi est déjà noté.' using errcode = '23505';   -- c2_37
  end if;
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
  -- c2_34 : partie, elle le dit — elle quitte « non_reglee » (l'état d'une relance décidée), son motif dit l'envoi, et
  -- aucun envoi ne peut plus lui être adossé (cashd_relances_garder_envoi_main)
  update public.cashd_relances
     set statut = 'envoyee',   -- c2_37
         motif = left(format('envoyée à la main le %s (%s) : elle ne repartira pas', to_char(v_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), p_canal), 500),
         maj_le = now()
   where id = r.id;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_envoyee_main', 'cashd_relances', r.id::text,
    jsonb_build_object('canal', p_canal, 'envoye_le', v_le, 'destinataire', r.destinataire_adresse, 'palier', r.palier, 'montant', r.montant), r.entite_id);
  return to_jsonb(x);
end $function$;

revoke execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) to authenticated, service_role;

-- La reprise : les relances déjà notées envoyées à la main.
update public.cashd_relances r
   set statut = 'envoyee',
       motif = coalesce(r.motif, left(format('envoyée à la main le %s (%s) : elle ne repartira pas', to_char(m.envoye_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), m.canal), 500)),
       maj_le = now()
  from public.cashd_envois_main m
 where m.relance_id = r.id and r.statut <> 'envoyee';
