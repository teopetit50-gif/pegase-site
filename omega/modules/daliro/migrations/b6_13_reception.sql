-- b6_13 — DALIRO : réception des travaux, réserves, décompte définitif, libération de la retenue (session B6, 06/10/2026)
-- Vague 3, n° 3. C'est là que l'argent bloqué se récupère : 5 % de chaque situation, un an après la réception.
--
-- RÈGLES TENUES PAR LA BASE.
--   · Réception (une par chantier) : prononcée à une date passée, avec ou sans réserves (une ligne par réserve,
--     lot facultatif) ; le chantier passe « réceptionné » (date_reception posée, transition du socle).
--   · Réserves : ouvertes → levées (date, pièce facultative) ; la garantie de parfait achèvement court un an
--     (Code civil, art. 1792-6).
--   · Retenue de garantie (loi n° 71-584 du 16 juillet 1971, art. 2) : le montant est la somme des retenues des
--     situations validées ; elle est due un an après la réception, SAUF opposition motivée du maître d'ouvrage
--     notifiée par lettre recommandée avant cette date. États : bloquée jusqu'au… → libérable (date passée, pas
--     d'opposition) → libérée (remboursée, ou caution levée) ; ou opposée (motif, date). Une libération avant
--     un an n'est notée qu'avec l'accord du maître d'ouvrage et toutes les réserves levées ; une retenue opposée
--     ne se libère qu'une fois toutes les réserves levées.
--   · Décompte définitif : le projet (montant du marché + avenants signés, facturé HT par les situations validées,
--     reste à facturer, retenue cumulée), à envoyer dans les 45 jours de la réception (protocole interprofessionnel
--     de juin 2010, FFB) ; projet → envoyé → accepté | contesté (motif).
--   · Alertes au client (private.btp_alerter_reception, appelée chaque jour par btp_tache_confirmations) : décompte
--     pas envoyé à J+30 ; retenue libérable (« réclamez-la ») ; réserves encore ouvertes à 60 jours.
--   · Écriture par les portes seules (SECURITY DEFINER, bureau qui voit les prix) ; lecture sous RLS (entité + prix).
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.

create table if not exists public.btp_receptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  date_reception date not null,
  avec_reserves boolean not null default false,
  piece_id uuid,
  retenue_montant numeric(14,2) not null default 0,
  retenue_caution boolean not null default false,
  retenue_due_le date not null,
  retenue_statut text not null default 'bloquee',
  opposition_le date,
  opposition_motif text,
  liberee_le date,
  liberee_avant_terme boolean not null default false,
  decompte_statut text not null default 'a_preparer',
  decompte_marche_ht numeric(14,2),
  decompte_facture_ht numeric(14,2),
  decompte_reste_ht numeric(14,2),
  decompte_retenue numeric(14,2),
  decompte_prepare_le timestamptz,
  decompte_envoye_le date,
  decompte_repondu_le date,
  decompte_motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_receptions_client_id_id_key unique (client_id, id),
  constraint btp_receptions_une_par_chantier unique (chantier_id),
  constraint btp_receptions_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_receptions_retenue_statut_check check (retenue_statut in ('bloquee', 'opposee', 'liberee')),
  constraint btp_receptions_decompte_statut_check check (decompte_statut in ('a_preparer', 'projet', 'envoye', 'accepte', 'conteste')),
  constraint btp_receptions_opposition_check check ((retenue_statut <> 'opposee') or (opposition_le is not null and opposition_motif is not null)),
  constraint btp_receptions_motifs_check check (char_length(opposition_motif) <= 500 and char_length(decompte_motif) <= 500)
);
comment on table public.btp_receptions is 'DALIRO — réception d''un chantier, retenue de garantie (loi 71-584) et décompte définitif ; écrite par les portes seules.';

create table if not exists public.btp_reserves (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reception_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  ordre integer not null default 0,
  description text not null,
  statut text not null default 'ouverte',
  levee_le date,
  levee_piece_id uuid,
  cree_le timestamptz not null default now(),
  constraint btp_reserves_client_id_id_key unique (client_id, id),
  constraint btp_reserves_reception_fkey foreign key (client_id, reception_id) references public.btp_receptions(client_id, id) on delete cascade,
  constraint btp_reserves_statut_check check (statut in ('ouverte', 'levee')),
  constraint btp_reserves_levee_check check ((statut = 'ouverte') = (levee_le is null)),
  constraint btp_reserves_description_check check (char_length(btrim(description)) between 1 and 1000)
);
create index if not exists btp_reserves_reception_idx on public.btp_reserves (reception_id, ordre);

alter table public.btp_receptions enable row level security;
alter table public.btp_reserves enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_receptions' and policyname = 'qui voit les prix lit les receptions de ses chantiers') then
    create policy "qui voit les prix lit les receptions de ses chantiers" on public.btp_receptions
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id) and private.btp_voit_prix(client_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_reserves' and policyname = 'membres lisent les reserves de leurs chantiers') then
    create policy "membres lisent les reserves de leurs chantiers" on public.btp_reserves
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_receptions from anon, authenticated;
revoke all on table public.btp_reserves from anon, authenticated;
grant select on table public.btp_receptions to authenticated;
grant select on table public.btp_reserves to authenticated;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_receptions', 'btp_reserves']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- La retenue cumulée des situations validées d'un chantier, et si une caution la remplace.
create or replace function private.btp_retenue_chantier(p_chantier uuid)
 returns table(montant numeric, caution boolean)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(sum(s.retenue), 0)::numeric,
         coalesce(bool_or(s.retenue_caution), (select m.retenue_caution from public.btp_marches m
                                                where m.chantier_id = p_chantier and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1), false)
  from public.btp_situations s where s.chantier_id = p_chantier and s.statut = 'validee'
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Prononcer la réception
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_prononcer_reception(p_chantier uuid, p_date date, p_reserves jsonb default '[]'::jsonb, p_piece uuid default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_id uuid;
  r jsonb;
  v_lot uuid;
  v_ordre integer := 0;
  v_retenue numeric;
  v_caution boolean;
  v_nb integer;
begin
  select * into c from public.btp_chantiers where id = p_chantier for update;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  if exists (select 1 from public.btp_receptions x where x.chantier_id = c.id) then
    raise exception 'La réception de ce chantier est déjà prononcée.' using errcode = '23514';
  end if;
  if c.statut not in ('ouvert', 'suspendu') then
    raise exception 'Une réception se prononce sur un chantier ouvert ou suspendu (celui-ci est %).', c.statut using errcode = '23514';
  end if;
  if p_date is null or p_date > current_date then
    raise exception 'La date de réception est celle du procès-verbal : aujourd''hui ou avant.' using errcode = '22023';
  end if;
  if p_reserves is null or jsonb_typeof(p_reserves) <> 'array' then
    raise exception 'Les réserves forment une liste (éventuellement vide).' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces p where p.id = p_piece and p.client_id = c.client_id) then
    raise exception 'Le procès-verbal n''est pas une pièce de l''organisation.' using errcode = '23514';
  end if;
  select x.montant, x.caution into v_retenue, v_caution from private.btp_retenue_chantier(c.id) x;
  v_nb := jsonb_array_length(p_reserves);
  insert into public.btp_receptions (client_id, chantier_id, entite_id, date_reception, avec_reserves, piece_id,
                                     retenue_montant, retenue_caution, retenue_due_le)
  values (c.client_id, c.id, c.entite_id, p_date, v_nb > 0, p_piece, v_retenue, v_caution, (p_date + interval '1 year')::date)
  returning id into v_id;
  for r in select * from jsonb_array_elements(p_reserves) loop
    if coalesce(btrim(r ->> 'description'), '') = '' then
      raise exception 'Chaque réserve porte une description.' using errcode = '22023';
    end if;
    v_lot := null;
    if nullif(r ->> 'lot_id', '') is not null then
      select l.id into v_lot from public.btp_lots l where l.chantier_id = c.id and l.id = (r ->> 'lot_id')::uuid;
    elsif nullif(r ->> 'lot', '') is not null then
      select l.id into v_lot from public.btp_lots l where l.chantier_id = c.id and l.code = r ->> 'lot';
    end if;
    v_ordre := v_ordre + 1;
    insert into public.btp_reserves (client_id, reception_id, chantier_id, entite_id, lot_id, ordre, description)
    values (c.client_id, v_id, c.id, c.entite_id, v_lot, v_ordre, left(btrim(r ->> 'description'), 1000));
  end loop;
  update public.btp_chantiers set statut = 'receptionne', date_reception = p_date where id = c.id;
  perform private.journaliser(c.client_id, 'daliro.reception_prononcee', 'btp_receptions', v_id::text,
    jsonb_build_object('chantier', c.id, 'date', p_date, 'reserves', v_nb, 'retenue', v_retenue, 'caution', v_caution,
                       'retenue_due_le', (p_date + interval '1 year')::date), c.entite_id);
  perform private.publier_evenement(c.client_id, 'daliro.reception_prononcee',
    jsonb_build_object('reception', v_id, 'chantier', c.id, 'date', p_date, 'reserves', v_nb), 'reception:' || v_id::text);
  return v_id;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Lever une réserve
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_lever_reserve(p_reserve uuid, p_date date default current_date, p_piece uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v public.btp_reserves;
  x public.btp_receptions;
begin
  select * into v from public.btp_reserves where id = p_reserve for update;
  if not found then
    raise exception 'Réserve introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(v.client_id, v.entite_id);
  if v.statut = 'levee' then
    raise exception 'Cette réserve est déjà levée (le %).', to_char(v.levee_le, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  select * into x from public.btp_receptions where id = v.reception_id;
  if p_date is null or p_date > current_date or p_date < x.date_reception then
    raise exception 'Une réserve se lève entre la réception (%) et aujourd''hui.', to_char(x.date_reception, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces p where p.id = p_piece and p.client_id = v.client_id) then
    raise exception 'La pièce n''est pas une pièce de l''organisation.' using errcode = '23514';
  end if;
  update public.btp_reserves set statut = 'levee', levee_le = p_date, levee_piece_id = p_piece where id = v.id returning * into v;
  perform private.journaliser(v.client_id, 'daliro.reserve_levee', 'btp_receptions', v.reception_id::text,
    jsonb_build_object('reserve', v.id, 'description', left(v.description, 200), 'levee_le', p_date, 'piece', p_piece), v.entite_id);
  return to_jsonb(v);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La retenue : opposition du maître d'ouvrage, libération
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_opposer_retenue(p_reception uuid, p_motif text, p_date date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_receptions;
begin
  select * into x from public.btp_receptions where id = p_reception for update;
  if not found then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if x.retenue_statut <> 'bloquee' then
    raise exception 'La retenue est déjà %.', case x.retenue_statut when 'opposee' then 'frappée d''opposition' else 'libérée' end using errcode = '23514';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Une opposition est motivée (loi n° 71-584, art. 2) : le motif est obligatoire.' using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date or p_date < x.date_reception then
    raise exception 'La date de l''opposition est entre la réception et aujourd''hui.' using errcode = '22023';
  end if;
  if p_date >= x.retenue_due_le then
    raise exception 'Trop tard : une opposition se notifie avant le % (un an après la réception) ; passé ce délai, la retenue est due.', to_char(x.retenue_due_le, 'DD/MM/YYYY')
      using errcode = '23514';
  end if;
  update public.btp_receptions set retenue_statut = 'opposee', opposition_le = p_date, opposition_motif = left(btrim(p_motif), 500), maj_le = now()
  where id = x.id returning * into x;
  perform private.journaliser(x.client_id, 'daliro.retenue_opposee', 'btp_receptions', x.id::text,
    jsonb_build_object('le', p_date, 'motif', p_motif, 'montant', x.retenue_montant), x.entite_id);
  return to_jsonb(x);
end $function$;

create or replace function public.btp_liberer_retenue(p_reception uuid, p_date date default current_date, p_accord_maitre_ouvrage boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_receptions;
  v_ouvertes integer;
  v_avant boolean;
begin
  select * into x from public.btp_receptions where id = p_reception for update;
  if not found then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if x.retenue_statut = 'liberee' then
    raise exception 'La retenue est déjà libérée (le %).', to_char(x.liberee_le, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  if p_date is null or p_date > current_date or p_date < x.date_reception then
    raise exception 'La date de libération est entre la réception et aujourd''hui.' using errcode = '22023';
  end if;
  select count(*) into v_ouvertes from public.btp_reserves r where r.reception_id = x.id and r.statut = 'ouverte';
  if x.retenue_statut = 'opposee' and v_ouvertes > 0 then
    raise exception 'La retenue est frappée d''opposition et % réserve(s) reste(nt) ouverte(s) : levez-les d''abord.', v_ouvertes using errcode = '23514';
  end if;
  v_avant := p_date < x.retenue_due_le;
  if v_avant and x.retenue_statut <> 'opposee' and not (coalesce(p_accord_maitre_ouvrage, false) and v_ouvertes = 0) then
    raise exception 'La retenue est due le % : avant, il faut l''accord du maître d''ouvrage et toutes les réserves levées (% ouverte(s)).',
      to_char(x.retenue_due_le, 'DD/MM/YYYY'), v_ouvertes using errcode = '23514';
  end if;
  update public.btp_receptions set retenue_statut = 'liberee', liberee_le = p_date, liberee_avant_terme = v_avant, maj_le = now()
  where id = x.id returning * into x;
  perform private.journaliser(x.client_id, 'daliro.retenue_liberee', 'btp_receptions', x.id::text,
    jsonb_build_object('le', p_date, 'montant', x.retenue_montant, 'caution', x.retenue_caution, 'avant_terme', v_avant,
                       'accord_maitre_ouvrage', coalesce(p_accord_maitre_ouvrage, false)), x.entite_id);
  return to_jsonb(x);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le décompte définitif
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_preparer_decompte(p_reception uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_receptions;
  v_marche numeric(14,2);
  v_avenants numeric(14,2);
  v_facture numeric(14,2);
  v_retenue numeric;
  v_caution boolean;
begin
  select * into x from public.btp_receptions where id = p_reception for update;
  if not found then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if x.decompte_statut in ('envoye', 'accepte', 'conteste') then
    raise exception 'Le décompte est déjà envoyé : il ne se recalcule plus.' using errcode = '23514';
  end if;
  select coalesce(sum(l.montant_ht), 0) into v_marche
  from public.btp_lignes_marche l
  join public.btp_marches m on m.id = l.marche_id
  where m.chantier_id = x.chantier_id and m.statut = 'verifie' and l.nature <> 'option'
    and m.id = (select m2.id from public.btp_marches m2 where m2.chantier_id = x.chantier_id and m2.statut = 'verifie' order by m2.verifie_le desc nulls last limit 1);
  select coalesce(sum(l.montant_ht), 0) into v_avenants
  from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
  where a.chantier_id = x.chantier_id and a.statut = 'signe' and not l.retiree;
  select coalesce(max(s.cumul_ht) filter (where s.numero = (select max(s2.numero) from public.btp_situations s2 where s2.chantier_id = x.chantier_id and s2.statut = 'validee')), 0)
    into v_facture
  from public.btp_situations s where s.chantier_id = x.chantier_id and s.statut = 'validee';
  select r.montant, r.caution into v_retenue, v_caution from private.btp_retenue_chantier(x.chantier_id) r;
  update public.btp_receptions
  set decompte_statut = 'projet', decompte_marche_ht = v_marche + v_avenants, decompte_facture_ht = v_facture,
      decompte_reste_ht = v_marche + v_avenants - v_facture, decompte_retenue = v_retenue,
      retenue_montant = case when retenue_statut = 'bloquee' then v_retenue else retenue_montant end,
      retenue_caution = v_caution, decompte_prepare_le = now(), maj_le = now()
  where id = x.id returning * into x;
  perform private.journaliser(x.client_id, 'daliro.decompte_prepare', 'btp_receptions', x.id::text,
    jsonb_build_object('marche_ht', x.decompte_marche_ht, 'facture_ht', x.decompte_facture_ht, 'reste_ht', x.decompte_reste_ht,
                       'retenue', x.decompte_retenue), x.entite_id);
  return to_jsonb(x);
end $function$;

create or replace function public.btp_envoyer_decompte(p_reception uuid, p_date date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_receptions;
begin
  select * into x from public.btp_receptions where id = p_reception for update;
  if not found then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if x.decompte_statut <> 'projet' then
    raise exception 'Seul un projet de décompte préparé s''envoie (il est %).', x.decompte_statut using errcode = '23514';
  end if;
  if p_date is null or p_date > current_date or p_date < x.date_reception then
    raise exception 'La date d''envoi est entre la réception et aujourd''hui.' using errcode = '22023';
  end if;
  update public.btp_receptions set decompte_statut = 'envoye', decompte_envoye_le = p_date, maj_le = now() where id = x.id returning * into x;
  perform private.journaliser(x.client_id, 'daliro.decompte_envoye', 'btp_receptions', x.id::text,
    jsonb_build_object('le', p_date, 'jours_apres_reception', p_date - x.date_reception, 'reste_ht', x.decompte_reste_ht), x.entite_id);
  return to_jsonb(x);
end $function$;

create or replace function public.btp_repondre_decompte(p_reception uuid, p_accepte boolean, p_motif text default null, p_date date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_receptions;
begin
  select * into x from public.btp_receptions where id = p_reception for update;
  if not found then
    raise exception 'Réception introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if x.decompte_statut <> 'envoye' then
    raise exception 'Le décompte n''est pas en attente de réponse (il est %).', x.decompte_statut using errcode = '23514';
  end if;
  if p_accepte is null then
    raise exception 'Le maître d''ouvrage accepte ou conteste le décompte.' using errcode = '22023';
  end if;
  if not p_accepte and coalesce(btrim(p_motif), '') = '' then
    raise exception 'Une contestation porte son motif.' using errcode = '22023';
  end if;
  update public.btp_receptions
  set decompte_statut = case when p_accepte then 'accepte' else 'conteste' end, decompte_repondu_le = coalesce(p_date, current_date),
      decompte_motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now()
  where id = x.id returning * into x;
  perform private.journaliser(x.client_id, case when p_accepte then 'daliro.decompte_accepte' else 'daliro.decompte_conteste' end,
    'btp_receptions', x.id::text, jsonb_build_object('le', x.decompte_repondu_le, 'motif', p_motif), x.entite_id);
  return to_jsonb(x);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les alertes : décompte à envoyer, retenue à réclamer, réserves qui traînent
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_alerter_reception(p_client uuid, p_jour date default current_date)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_n integer := 0;
begin
  for x in select r.*, c.nom as chantier_nom, c.conducteur_id from public.btp_receptions r join public.btp_chantiers c on c.id = r.chantier_id
           where r.client_id = p_client loop
    if x.decompte_statut in ('a_preparer', 'projet') and p_jour >= x.date_reception + 30 then
      perform private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
        left(format('%s : le décompte final est à envoyer avant le %s (45 jours après la réception)', x.chantier_nom,
                    to_char(x.date_reception + 45, 'DD/MM/YYYY')), 150),
        jsonb_build_object('reception', x.id, 'chantier', x.chantier_id, 'echeance', x.date_reception + 45),
        'decompte_a_envoyer:' || x.id::text, true, x.conducteur_id);
      v_n := v_n + 1;
    end if;
    if x.retenue_statut = 'bloquee' and p_jour >= x.retenue_due_le and (x.retenue_montant > 0 or x.retenue_caution) then
      perform private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
        left(format('%s : la retenue de garantie (%s) est due depuis le %s, réclamez-la', x.chantier_nom,
                    case when x.retenue_caution then 'caution' else to_char(x.retenue_montant, 'FM999G999G990D00') || ' €' end,
                    to_char(x.retenue_due_le, 'DD/MM/YYYY')), 150),
        jsonb_build_object('reception', x.id, 'chantier', x.chantier_id, 'montant', x.retenue_montant, 'due_le', x.retenue_due_le),
        'retenue_due:' || x.id::text, true, null);
      v_n := v_n + 1;
    end if;
    if p_jour >= x.date_reception + 60 and exists (select 1 from public.btp_reserves v where v.reception_id = x.id and v.statut = 'ouverte') then
      perform private.lever_alerte_module(p_client, 'daliro_referentiel', 'attention',
        left(format('%s : %s réserve(s) encore ouverte(s) deux mois après la réception', x.chantier_nom,
                    (select count(*) from public.btp_reserves v where v.reception_id = x.id and v.statut = 'ouverte')), 150),
        jsonb_build_object('reception', x.id, 'chantier', x.chantier_id), 'reserves_ouvertes:' || x.id::text, true, x.conducteur_id);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $function$;

-- Le passage quotidien (b6_08) : plus les alertes de réception.
create or replace function private.btp_tache_confirmations()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat', private.btp_demander_confirmations(r.client_id, current_date));
      begin
        perform private.btp_alerter_fin_accord(r.client_id, now());
      exception when others then
        raise notice 'alerte de fin d''accord (%) : %', r.client_id, sqlerrm;
      end;
      begin
        perform private.btp_alerter_reception(r.client_id, current_date);
      exception when others then
        raise notice 'alertes de réception (%) : %', r.client_id, sqlerrm;
      end;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

-- Le tableau du chantier : b6_12, plus « reception ».
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.id), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id),
        -- b6_07 : la dernière demande J-2 partie pour ce passage (envois du socle, sous la RLS du lecteur)
        'envoi', (select jsonb_build_object('id', e.id, 'canal', e.canal, 'mode', e.mode, 'statut', e.statut, 'verrou', e.verrou,
                                            'cree_le', e.cree_le, 'envoye_le', e.envoye_le, 'remise', e.remise, 'remise_le', e.remise_le,
                                            -- b6_08 : approuvé par l'accord permanent (politique du socle) ?
                                            'accord', (select jsonb_build_object('politique', d.politique_id, 'active_le', p.active_le)
                                                       from public.demandes_validation d join public.politiques p on p.id = d.politique_id
                                                       where d.id = e.demande_id))
                  from public.envois e
                  where e.client_id = p.client_id and e.module = 'daliro' and e.objet_type = 'btp_passages' and e.objet_id = p.id::text
                  order by e.cree_le desc limit 1))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    -- b6_12 : les situations de travaux (lisibles par qui voit les prix ; sinon la RLS rend une liste vide)
    'situations', (select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(l) order by l.ordre, l.designation), '[]'::jsonb)
                   from public.btp_situations_lignes l where l.situation_id = s.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = s.demande_id))
        order by s.numero desc), '[]'::jsonb)
      from public.btp_situations s where s.chantier_id = c.id and s.statut <> 'annulee'),
    -- b6_13 : la réception, ses réserves, la retenue et le décompte (la réception se lit avec le droit de voir les prix)
    'reception', (select to_jsonb(x) || jsonb_build_object(
        'retenue_etat', case when x.retenue_statut = 'bloquee' and current_date >= x.retenue_due_le then 'liberable' else x.retenue_statut end,
        'decompte_echeance', x.date_reception + 45,
        'reserves', (select coalesce(jsonb_agg(to_jsonb(v) order by v.ordre), '[]'::jsonb) from public.btp_reserves v where v.reception_id = x.id))
      from public.btp_receptions x where x.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;

revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_retenue_chantier(uuid) from public, anon, authenticated;
revoke execute on function private.btp_alerter_reception(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_retenue_chantier(uuid) to service_role;
grant execute on function private.btp_alerter_reception(uuid, date) to service_role;
grant execute on function private.btp_tache_confirmations() to service_role;
revoke execute on function public.btp_prononcer_reception(uuid, date, jsonb, uuid) from public, anon;
revoke execute on function public.btp_lever_reserve(uuid, date, uuid) from public, anon;
revoke execute on function public.btp_opposer_retenue(uuid, text, date) from public, anon;
revoke execute on function public.btp_liberer_retenue(uuid, date, boolean) from public, anon;
revoke execute on function public.btp_preparer_decompte(uuid) from public, anon;
revoke execute on function public.btp_envoyer_decompte(uuid, date) from public, anon;
revoke execute on function public.btp_repondre_decompte(uuid, boolean, text, date) from public, anon;
grant execute on function public.btp_prononcer_reception(uuid, date, jsonb, uuid) to authenticated, service_role;
grant execute on function public.btp_lever_reserve(uuid, date, uuid) to authenticated, service_role;
grant execute on function public.btp_opposer_retenue(uuid, text, date) to authenticated, service_role;
grant execute on function public.btp_liberer_retenue(uuid, date, boolean) to authenticated, service_role;
grant execute on function public.btp_preparer_decompte(uuid) to authenticated, service_role;
grant execute on function public.btp_envoyer_decompte(uuid, date) to authenticated, service_role;
grant execute on function public.btp_repondre_decompte(uuid, boolean, text, date) to authenticated, service_role;
