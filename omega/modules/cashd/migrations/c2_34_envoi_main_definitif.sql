-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_34 : une relance envoyée à la main ne peut plus repartir (21/10/2026, session C2 — TCASHD-16)
-- ═══════════════════════════════════════════════════════════════════════════
-- Notée envoyée à la main, une relance « non_reglee » le restait, avec le motif « l'envoi viendra une fois le réglage
-- posé » (recette T-CASHD, rappel 5d7cba3f, A-C19) : un réglage d'envoi posé plus tard pouvait la faire partir une
-- seconde fois. Désormais :
--   · notée envoyée à la main, elle quitte « non_reglee » pour l'état d'une relance décidée, et son motif dit l'envoi
--     (« envoyée à la main le 21/10/2026 (email) : elle ne repartira pas ») ;
--   · la vue cashd_relances_etat la dit « envoyee » dès que l'envoi à la main est noté ;
--   · un déclencheur refuse d'adosser un envoi à une relance déjà envoyée à la main, quel que soit le chemin (pose
--     d'un réglage, reprise, passage) ;
--   · la reprise remet d'aplomb, une fois, les relances déjà notées ainsi.
-- (Le statut « envoyee » n'est pas ajouté à la contrainte de cashd_relances : il faudrait la supprimer d'abord.)
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Une relance envoyée à la main ne reçoit plus d'envoi.
create or replace function private.cashd_garder_envoi_main()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.envoi_id is not null and new.envoi_id is distinct from old.envoi_id
     and exists (select 1 from public.cashd_envois_main m where m.relance_id = new.id) then
    raise exception 'Cette relance est déjà partie à la main : elle ne repart pas.' using errcode = '55000';
  end if;
  return new;
end $function$;

create or replace trigger cashd_relances_garder_envoi_main
  before update of envoi_id on public.cashd_relances
  for each row execute function private.cashd_garder_envoi_main();

revoke execute on function private.cashd_garder_envoi_main() from public, anon, authenticated;

-- Une relance et son état (c2_02) : « envoyee » dès que l'envoi à la main est noté.
do $vue$ begin
  execute $v$
create or replace view public.cashd_relances_etat with (security_invoker = true) as
select r.id, r.client_id, r.entite_id, r.compte_id, r.jour, r.nature, r.palier, r.langue, r.canal, r.destinataire_adresse,
       r.destinataire_nom, r.sujet, r.corps, r.montant, r.penalites, r.indemnites, r.statut, r.motif, r.demande_id, r.envoi_id,
       r.prepare_par, r.cree_le, r.maj_le,
       d.statut as demande_statut, d.decide_le, d.politique_id,
       e.statut as envoi_statut, e.mode as envoi_mode, e.envoye_le,
       case
         when exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id) then 'envoyee'   -- c2_34
         when r.statut <> 'a_valider' then r.statut
         when e.statut = 'envoye' or e.envoye_le is not null then 'envoyee'
         when d.statut = 'approuvee' then 'validee'
         when d.statut = 'rejetee' then 'refusee'
         when d.statut in ('annulee', 'expiree') then 'coupee'
         else 'a_valider' end as etat,
       (select count(*) from public.cashd_relances_pieces p where p.relance_id = r.id and not p.annulee)::integer as nb_pieces
from public.cashd_relances r
left join public.demandes_validation d on d.id = r.demande_id
left join public.envois e on e.id = r.envoi_id
$v$;
exception when invalid_table_definition then
  raise notice 'public.cashd_relances_etat : étendue par une migration plus récente, gardée telle quelle.';
end $vue$;

-- Noter un envoi à la main (c2_32) : la relance dit qu'elle est partie.
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
  -- c2_34 : partie, elle le dit — elle quitte « non_reglee » (l'état d'une relance décidée), son motif dit l'envoi, et
  -- aucun envoi ne peut plus lui être adossé (cashd_relances_garder_envoi_main)
  update public.cashd_relances
     set statut = case when statut = 'non_reglee' then 'a_valider' else statut end,
         motif = left(format('envoyée à la main le %s (%s) : elle ne repartira pas', to_char(v_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), p_canal), 500),
         maj_le = now()
   where id = r.id;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_envoyee_main', 'cashd_relances', r.id::text,
    jsonb_build_object('canal', p_canal, 'envoye_le', v_le, 'destinataire', r.destinataire_adresse, 'palier', r.palier, 'montant', r.montant), r.entite_id);
  return to_jsonb(x);
end $function$;

revoke execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) to authenticated, service_role;

-- La reprise : les relances « non_reglee » déjà notées envoyées à la main.
update public.cashd_relances r
   set statut = 'a_valider',
       motif = left(format('envoyée à la main le %s (%s) : elle ne repartira pas', to_char(m.envoye_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), m.canal), 500),
       maj_le = now()
  from public.cashd_envois_main m
 where m.relance_id = r.id and r.statut = 'non_reglee';
