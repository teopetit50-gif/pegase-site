-- TAUX DE CHANGE BCE (B7), lot 7 — les portes de l'ouvrier `taux-bce`.
--
-- A4 a posé (a4_22) public.filed_taux_change (devise, jour, taux : unités de devise pour 1 €) et la porte
-- public.filed_poser_taux_change (service_role). La base ne fait aucun appel réseau : la fonction Edge `taux-bce`
-- lit chaque jour ouvré le flux public de la BCE (eurofxref-daily.xml ; eurofxref-hist-90d.xml pour combler un trou
-- ou au premier passage) et pose les taux par ce lot.
--
-- Ce que ce lot pose :
--   public.taux_bce_passages                  journal des passages (jour BCE lu, taux posés, alerte), service seul ;
--   public.taux_bce_etat() → jsonb            le dernier jour BCE en base, ses devises, le dernier passage ;
--   public.taux_bce_poser_lot(p_taux jsonb)   [{devise, jour, taux}] en un appel, par filed_poser_taux_change ;
--                                             un taux identique n'est pas réécrit, une saisie humaine n'est jamais
--                                             écrasée ; rend {recus, poses, inchanges, saisies_gardees, refuses} ;
--   public.taux_bce_noter_passage(p_detail, p_alerte)   le battement (une ligne de passage) et, si p_alerte,
--                                             une alerte interne, une seule par jour (clé taux_bce:AAAA-MM-JJ),
--                                             refermée d'elle-même quand un passage suivant pose les taux du jour ;
--   public.taux_bce_veiller() → boolean       pour un cron SQL : alerte interne si aucun passage depuis 30 heures
--                                             un jour ouvré après 18 h (heure de Francfort) : l'ouvrier n'a pas tourné.
-- L'ouvrier n'a pas de client : le battement du socle (battements, par client) ne lui convient pas, d'où le journal
-- des passages. Dépend d'a4_22 (filed_taux_change, filed_poser_taux_change) et du socle (private.lever_alerte).
-- Rejouable ; rien n'est supprimé.

create table if not exists public.taux_bce_passages (
  id        bigint generated always as identity primary key,
  passe_le  timestamptz not null default now(),
  -- Le jour de cotation le plus récent lu dans le flux (null si le flux n'a pas été lu).
  jour_bce  date,
  poses     integer not null default 0,
  alerte    text,
  detail    jsonb not null default '{}'::jsonb
);
comment on table public.taux_bce_passages is
  'Passages de l''ouvrier taux-bce (fonction Edge) : ce qu''il a lu, posé, et l''alerte éventuelle. Service seul.';
alter table public.taux_bce_passages enable row level security;
revoke all on table public.taux_bce_passages from public, anon, authenticated;
create index if not exists taux_bce_passages_passe_le on public.taux_bce_passages (passe_le desc);

-- ───────────────────────────────────────────────────────────────────────────
-- État : d'où repartir
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.taux_bce_etat() returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'dernier_jour', (select max(t.jour) from public.filed_taux_change t where t.source = 'bce'),
    'devises', (select count(*) from public.filed_taux_change t
                 where t.source = 'bce' and t.jour = (select max(u.jour) from public.filed_taux_change u where u.source = 'bce')),
    'dernier_passage', (select max(p.passe_le) from public.taux_bce_passages p))
$$;
comment on function public.taux_bce_etat() is
  'Porte de l''ouvrier taux-bce : le dernier jour BCE en base, le nombre de devises de ce jour, le dernier passage. Réservée au service.';
revoke all on function public.taux_bce_etat() from public, anon, authenticated;
grant execute on function public.taux_bce_etat() to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Poser un lot de taux
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.taux_bce_poser_lot(p_taux jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  e jsonb;
  v_devise text;
  v_jour date;
  v_taux numeric;
  v_existant public.filed_taux_change;
  n_recus integer := 0;
  n_poses integer := 0;
  n_inchanges integer := 0;
  n_saisies integer := 0;
  n_refuses integer := 0;
begin
  if jsonb_typeof(coalesce(p_taux, '[]'::jsonb)) <> 'array' then
    raise exception 'Un lot de taux est un tableau [{devise, jour, taux}].' using errcode = '22023';
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_taux, '[]'::jsonb)) loop
    n_recus := n_recus + 1;
    begin
      v_devise := upper(e ->> 'devise');
      v_jour := (e ->> 'jour')::date;
      v_taux := (e ->> 'taux')::numeric;
      select * into v_existant from public.filed_taux_change where devise = v_devise and jour = v_jour;
      if v_existant.devise is not null and v_existant.source = 'saisie' then
        -- Une personne a posé ce taux : la BCE ne l'écrase pas.
        n_saisies := n_saisies + 1;
      elsif v_existant.devise is not null and v_existant.taux = round(v_taux, 8) then
        n_inchanges := n_inchanges + 1;
      else
        perform public.filed_poser_taux_change(v_devise, v_jour, v_taux, 'bce');
        n_poses := n_poses + 1;
      end if;
    exception when others then
      -- Une ligne fausse (devise, date ou taux) n'empêche pas les autres.
      n_refuses := n_refuses + 1;
    end;
  end loop;
  return jsonb_build_object('recus', n_recus, 'poses', n_poses, 'inchanges', n_inchanges, 'saisies_gardees', n_saisies, 'refuses', n_refuses);
end $$;
comment on function public.taux_bce_poser_lot(jsonb) is
  'Porte de l''ouvrier taux-bce : pose un lot [{devise, jour, taux}] par filed_poser_taux_change (source bce) ; un taux identique n''est pas réécrit, une saisie humaine n''est jamais écrasée. Réservée au service.';
revoke all on function public.taux_bce_poser_lot(jsonb) from public, anon, authenticated;
grant execute on function public.taux_bce_poser_lot(jsonb) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Le battement et l'alerte
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.taux_bce_noter_passage(p_detail jsonb default '{}'::jsonb, p_alerte text default null) returns bigint
language plpgsql security definer set search_path to '' as $$
declare
  v_id bigint;
  v_cle text := 'taux_bce:' || to_char((now() at time zone 'Europe/Berlin')::date, 'YYYY-MM-DD');
begin
  insert into public.taux_bce_passages (jour_bce, poses, alerte, detail)
  values ((p_detail ->> 'jour_bce')::date, coalesce((p_detail ->> 'poses')::integer, 0), nullif(btrim(p_alerte), ''), coalesce(p_detail, '{}'::jsonb))
  returning id into v_id;
  if nullif(btrim(p_alerte), '') is not null
     and not exists (select 1 from public.alertes a where a.cle_regroupement = v_cle and a.acquittee_le is null) then
    perform private.lever_alerte(null, true, 'attention', 'taux_bce', left(btrim(p_alerte), 200), coalesce(p_detail, '{}'::jsonb), v_cle);
  elsif nullif(btrim(p_alerte), '') is null
     and (p_detail ->> 'jour_bce') = to_char((now() at time zone 'Europe/Berlin')::date, 'YYYY-MM-DD') then
    -- Les taux du jour sont arrivés (un passage plus tard) : l'alerte du jour se referme, comme celle d'un battement.
    update public.alertes set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'les taux du jour sont posés')
     where cle_regroupement = v_cle and acquittee_le is null;
  end if;
  return v_id;
end $$;
comment on function public.taux_bce_noter_passage(jsonb, text) is
  'Porte de l''ouvrier taux-bce : note un passage (le battement) et, si p_alerte, lève une alerte interne, une seule par jour de Francfort. Réservée au service.';
revoke all on function public.taux_bce_noter_passage(jsonb, text) from public, anon, authenticated;
grant execute on function public.taux_bce_noter_passage(jsonb, text) to service_role;

-- Pour un cron SQL (par exemple chaque jour ouvré à 17 h UTC) : l'ouvrier a-t-il tourné ?
create or replace function public.taux_bce_veiller() returns boolean
language plpgsql security definer set search_path to '' as $$
declare
  v_local timestamp := now() at time zone 'Europe/Berlin';
  v_cle text := 'taux_bce:veille:' || to_char(v_local::date, 'YYYY-MM-DD');
begin
  if extract(isodow from v_local) > 5 or v_local::time < time '18:00' then
    return false;
  end if;
  if exists (select 1 from public.taux_bce_passages p where p.passe_le > now() - interval '30 hours') then
    return false;
  end if;
  if not exists (select 1 from public.alertes a where a.cle_regroupement = v_cle and a.acquittee_le is null) then
    perform private.lever_alerte(null, true, 'attention', 'taux_bce', 'L''ouvrier taux-bce n''a pas tourné depuis 30 heures.',
      jsonb_build_object('dernier_passage', (select max(p.passe_le) from public.taux_bce_passages p)), v_cle);
  end if;
  return true;
end $$;
comment on function public.taux_bce_veiller() is
  'Veille de l''ouvrier taux-bce, pour un cron SQL : un jour ouvré après 18 h à Francfort, alerte interne si aucun passage depuis 30 heures. Rend vrai si l''alerte est (ou reste) levée.';
revoke all on function public.taux_bce_veiller() from public, anon, authenticated;
grant execute on function public.taux_bce_veiller() to service_role;
