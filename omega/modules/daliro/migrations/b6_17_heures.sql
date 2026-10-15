-- b6_17 — DALIRO : le pointage des heures et la rentabilité réelle du chantier (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. Daliro sait ce qu'un chantier a vendu (marché vérifié + avenants signés), ce qu'il a facturé
-- (situations validées) et ce que les fournisseurs lui ont facturé (factures FILED rattachées, b6_03). Il ignore le
-- premier poste de dépense d'une entreprise du bâtiment : les heures de ses compagnons. Sans elles, pas de marge.
--
-- CE QUI EST POSÉ.
--   · public.btp_pointages : une ligne = un intervenant (btp_intervenants), un jour, un chantier, un lot facultatif,
--     des heures (au quart d'heure). Écrite par les portes seules ; lue par les membres qui voient le chantier.
--   · public.btp_couts_horaires : le coût horaire chargé (salaire brut + charges + congés et intempéries), par
--     intervenant ou par défaut pour l'entreprise, daté (« depuis le ») : changer un coût ne réécrit pas le passé.
--     Lu et écrit par qui voit les prix seulement.
--   · public.btp_pointer : pointer (ou corriger) les heures d'un intervenant ; 0 h efface le pointage du jour.
--   · public.btp_pointer_equipe : la même journée pour toute une équipe (chef compris).
--   · public.btp_poser_cout_horaire : poser un coût horaire (intervenant, ou défaut de l'entreprise).
--   · public.btp_heures_chantier(chantier, lundi) : la semaine à pointer (intervenants, heures, totaux) et, pour qui
--     voit les prix, la rentabilité à date : vendu, facturé, main-d'œuvre, achats, marge, lot par lot.
--
-- RÈGLES (Code du travail).
--   · 12 h au plus par jour et par intervenant, tous chantiers confondus (L3121-18 : 10 h ; L3121-19 : jusqu'à 12 h
--     par accord ou dérogation) : au-delà, refus. Au-delà de 10 h dans la journée ou de 48 h dans la semaine
--     (L3121-20), le pointage passe mais revient avec une alerte.
--   · Pas de pointage dans le futur ; correction possible sur 62 jours.
--   · Heures au quart d'heure.
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.

-- ─────────────────────────────────────────────────────────────────────────
-- Les tables
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.btp_couts_horaires (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  intervenant_id uuid,
  cout_horaire numeric(8,2) not null,
  depuis date not null,
  pose_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_couts_horaires_client_id_id_key unique (client_id, id),
  constraint btp_couts_horaires_un_par_date unique nulls not distinct (client_id, intervenant_id, depuis),
  constraint btp_couts_horaires_intervenant_fkey foreign key (client_id, intervenant_id) references public.btp_intervenants(client_id, id) on delete cascade,
  constraint btp_couts_horaires_cout_check check (cout_horaire > 0 and cout_horaire <= 500)
);
comment on table public.btp_couts_horaires is 'DALIRO — coût horaire chargé, par intervenant ou par défaut (intervenant_id null), daté.';
alter table public.btp_couts_horaires enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_couts_horaires' and policyname = 'qui voit les prix lit les couts horaires') then
    create policy "qui voit les prix lit les couts horaires" on public.btp_couts_horaires
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.btp_voit_prix(client_id));
  end if;
end $do$;
revoke all on table public.btp_couts_horaires from anon, authenticated;
grant select on table public.btp_couts_horaires to authenticated;

create table if not exists public.btp_pointages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  intervenant_id uuid not null,
  jour date not null,
  heures numeric(4,2) not null,
  note text,
  source text not null default 'saisie',
  saisi_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_pointages_client_id_id_key unique (client_id, id),
  constraint btp_pointages_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_pointages_lot_fkey foreign key (chantier_id, lot_id) references public.btp_lots(chantier_id, id) on delete set null (lot_id),
  constraint btp_pointages_intervenant_fkey foreign key (client_id, intervenant_id) references public.btp_intervenants(client_id, id),
  constraint btp_pointages_heures_check check (heures >= 0 and heures <= 12 and heures * 4 = trunc(heures * 4)),
  constraint btp_pointages_note_check check (char_length(note) <= 200),
  constraint btp_pointages_source_check check (source in ('saisie', 'equipe', 'message'))
);
comment on table public.btp_pointages is 'DALIRO — heures pointées : un intervenant, un jour, un chantier (et un lot). Écrit par btp_pointer.';
create index if not exists btp_pointages_chantier_idx on public.btp_pointages (chantier_id, jour);
create index if not exists btp_pointages_intervenant_idx on public.btp_pointages (intervenant_id, jour);
alter table public.btp_pointages enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_pointages' and policyname = 'membres lisent les heures de leurs chantiers') then
    create policy "membres lisent les heures de leurs chantiers" on public.btp_pointages
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_pointages from anon, authenticated;
grant select on table public.btp_pointages to authenticated;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_couts_horaires', 'btp_pointages']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Qui pointe : le bureau du chantier (gérant, admin, valideur, collaborateur) ; le serveur.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_exiger_pointage(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if private.btp_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null
     or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Les heures de ce chantier ne vous sont pas ouvertes.' using errcode = '42501';
  end if;
end $function$;

-- Le coût horaire d'un intervenant un jour donné : le sien, sinon celui de l'entreprise ; null si aucun n'est posé.
create or replace function private.btp_cout_horaire(p_client uuid, p_intervenant uuid, p_jour date)
 returns numeric
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(
    (select c.cout_horaire from public.btp_couts_horaires c
      where c.client_id = p_client and c.intervenant_id = p_intervenant and c.depuis <= p_jour order by c.depuis desc limit 1),
    (select c.cout_horaire from public.btp_couts_horaires c
      where c.client_id = p_client and c.intervenant_id is null and c.depuis <= p_jour order by c.depuis desc limit 1))
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Pointer
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_pointer_un(p_chantier public.btp_chantiers, p_intervenant uuid, p_jour date, p_heures numeric,
                                                  p_lot uuid, p_note text, p_source text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  i public.btp_intervenants;
  v_id uuid;
  v_jour_total numeric;
  v_semaine_total numeric;
  v_lundi date := p_jour - (extract(isodow from p_jour)::integer - 1);
  v_alertes jsonb := '[]'::jsonb;
begin
  select * into i from public.btp_intervenants where client_id = p_chantier.client_id and id = p_intervenant;
  if not found then
    raise exception 'Intervenant introuvable.' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('btp_pointage:' || i.id::text || ':' || p_jour::text, 0));

  select p.id into v_id from public.btp_pointages p
  where p.intervenant_id = i.id and p.chantier_id = p_chantier.id and p.jour = p_jour and p.lot_id is not distinct from p_lot
  order by p.cree_le limit 1 for update;

  select coalesce(sum(p.heures), 0) into v_jour_total from public.btp_pointages p
  where p.intervenant_id = i.id and p.jour = p_jour and p.id is distinct from v_id;
  v_jour_total := v_jour_total + p_heures;
  if v_jour_total > 12 then
    raise exception '% : % h ce jour-là, tous chantiers confondus ; 12 h au plus (Code du travail, L3121-18 et L3121-19).',
      i.nom, translate(regexp_replace(to_char(v_jour_total, 'FM990.99'), '\.$', ''), '.', ',') using errcode = '23514';
  end if;
  if not i.actif and v_id is null and p_heures > 0 then
    raise exception '% n''est plus actif : réactivez-le avant de pointer.', i.nom using errcode = '23514';
  end if;

  if v_id is null then
    if p_heures > 0 then
      insert into public.btp_pointages (client_id, chantier_id, entite_id, lot_id, intervenant_id, jour, heures, note, source, saisi_par)
      values (p_chantier.client_id, p_chantier.id, p_chantier.entite_id, p_lot, i.id, p_jour, p_heures, p_note, p_source, (select auth.uid()))
      returning id into v_id;
    end if;
  else
    update public.btp_pointages
       set heures = p_heures, note = coalesce(p_note, note), source = p_source, saisi_par = (select auth.uid()), maj_le = now()
     where id = v_id;
  end if;

  select coalesce(sum(p.heures), 0) into v_semaine_total from public.btp_pointages p
  where p.intervenant_id = i.id and p.jour between v_lundi and v_lundi + 6;
  if v_jour_total > 10 then
    v_alertes := v_alertes || to_jsonb(format('%s : %s h le %s, au-delà de 10 h (L3121-18) : il faut un accord ou une dérogation.',
                                               i.nom, translate(regexp_replace(to_char(v_jour_total, 'FM990.99'), '\.$', ''), '.', ','), to_char(p_jour, 'DD/MM')));
  end if;
  if v_semaine_total > 48 then
    v_alertes := v_alertes || to_jsonb(format('%s : %s h dans la semaine du %s, au-delà de 48 h (L3121-20).',
                                               i.nom, translate(regexp_replace(to_char(v_semaine_total, 'FM990.99'), '\.$', ''), '.', ','), to_char(v_lundi, 'DD/MM')));
  end if;
  return jsonb_build_object('id', v_id, 'intervenant_id', i.id, 'jour', p_jour, 'heures', p_heures,
                            'jour_total', v_jour_total, 'semaine_total', v_semaine_total, 'alertes', v_alertes);
end $function$;

create or replace function private.btp_controler_pointage(c public.btp_chantiers, p_jour date, p_heures numeric, p_lot uuid)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_aujourdhui date := (now() at time zone 'Europe/Paris')::date;
begin
  if c.statut in ('preparation', 'annule') then
    raise exception 'Le chantier n''est pas ouvert : on n''y pointe pas d''heures.' using errcode = '23514';
  end if;
  if p_jour is null or p_jour > v_aujourdhui then
    raise exception 'On ne pointe pas un jour à venir.' using errcode = '22023';
  end if;
  if p_jour < v_aujourdhui - 62 then
    raise exception 'Un pointage se corrige sur 62 jours au plus.' using errcode = '22023';
  end if;
  if p_heures is null or p_heures < 0 or p_heures > 12 or p_heures * 4 <> trunc(p_heures * 4) then
    raise exception 'Les heures vont de 0 à 12, au quart d''heure.' using errcode = '22023';
  end if;
  if p_lot is not null and not exists (select 1 from public.btp_lots l where l.chantier_id = c.id and l.id = p_lot) then
    raise exception 'Ce lot n''est pas celui de ce chantier.' using errcode = '22023';
  end if;
end $function$;

create or replace function public.btp_pointer(p_chantier uuid, p_intervenant uuid, p_jour date, p_heures numeric,
                                              p_lot uuid default null, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_r jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_pointage(c.client_id, c.entite_id);
  perform private.btp_controler_pointage(c, p_jour, p_heures, p_lot);
  v_r := private.btp_pointer_un(c, p_intervenant, p_jour, p_heures, p_lot, left(nullif(btrim(p_note), ''), 200), 'saisie');
  perform private.journaliser(c.client_id, 'daliro.heures_pointees', 'btp_chantiers', c.id::text,
    jsonb_build_object('intervenant', p_intervenant, 'jour', p_jour, 'heures', p_heures, 'lot', p_lot), c.entite_id);
  return v_r;
end $function$;

create or replace function public.btp_pointer_equipe(p_chantier uuid, p_equipe uuid, p_jour date, p_heures numeric, p_lot uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  e public.btp_equipes;
  r record;
  v_r jsonb;
  v_lignes jsonb := '[]'::jsonb;
  v_alertes jsonb := '[]'::jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_pointage(c.client_id, c.entite_id);
  perform private.btp_controler_pointage(c, p_jour, p_heures, p_lot);
  select * into e from public.btp_equipes where client_id = c.client_id and id = p_equipe;
  if not found then
    raise exception 'Équipe introuvable.' using errcode = 'P0002';
  end if;
  for r in
    select i.id from public.btp_intervenants i
    where i.client_id = c.client_id and i.actif and (i.equipe_id = e.id or i.id = e.chef_id)
    order by i.nom collate "C"
  loop
    v_r := private.btp_pointer_un(c, r.id, p_jour, p_heures, p_lot, null, 'equipe');
    v_lignes := v_lignes || v_r;
    v_alertes := v_alertes || coalesce(v_r -> 'alertes', '[]'::jsonb);
  end loop;
  if jsonb_array_length(v_lignes) = 0 then
    raise exception 'L''équipe % n''a aucun intervenant actif.', e.nom using errcode = '23514';
  end if;
  perform private.journaliser(c.client_id, 'daliro.heures_pointees', 'btp_chantiers', c.id::text,
    jsonb_build_object('equipe', e.id, 'jour', p_jour, 'heures', p_heures, 'lot', p_lot, 'intervenants', jsonb_array_length(v_lignes)), c.entite_id);
  return jsonb_build_object('equipe', e.nom, 'pointes', jsonb_array_length(v_lignes), 'lignes', v_lignes, 'alertes', v_alertes);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le coût horaire chargé
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_poser_cout_horaire(p_client uuid, p_intervenant uuid, p_cout numeric, p_depuis date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_depuis date := coalesce(p_depuis, (now() at time zone 'Europe/Paris')::date);
  v_id uuid;
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Le coût horaire se pose par le gérant, un admin ou un valideur.' using errcode = '42501';
    end if;
    if not private.btp_voit_prix(p_client) then
      raise exception 'Il faut le droit de voir les prix pour poser un coût horaire.' using errcode = '42501';
    end if;
  end if;
  if p_cout is null or p_cout <= 0 or p_cout > 500 then
    raise exception 'Le coût horaire chargé est entre 0 et 500 €.' using errcode = '22023';
  end if;
  if p_intervenant is not null and not exists (select 1 from public.btp_intervenants i where i.client_id = p_client and i.id = p_intervenant) then
    raise exception 'Intervenant introuvable.' using errcode = 'P0002';
  end if;
  insert into public.btp_couts_horaires (client_id, intervenant_id, cout_horaire, depuis, pose_par)
  values (p_client, p_intervenant, round(p_cout, 2), v_depuis, (select auth.uid()))
  on conflict on constraint btp_couts_horaires_un_par_date
  do update set cout_horaire = excluded.cout_horaire, pose_par = excluded.pose_par, maj_le = now()
  returning id into v_id;
  perform private.journaliser(p_client, 'daliro.cout_horaire_pose', 'btp_couts_horaires', v_id::text,
    jsonb_build_object('intervenant', p_intervenant, 'cout_horaire', round(p_cout, 2), 'depuis', v_depuis), null);
  return jsonb_build_object('id', v_id, 'intervenant_id', p_intervenant, 'cout_horaire', round(p_cout, 2), 'depuis', v_depuis);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La rentabilité à date (chiffres : le serveur, ou qui voit les prix)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_rentabilite(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_situation uuid;
  v_lots jsonb;
  v_vendu numeric := 0; v_facture numeric := 0; v_mo numeric := 0; v_achats numeric := 0; v_heures numeric := 0; v_sans_cout numeric := 0;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  select s.id into v_situation from public.btp_situations s
  where s.chantier_id = c.id and s.statut = 'validee' order by s.numero desc limit 1;

  with lots as (
    select l.id, l.code, l.libelle, l.rang from public.btp_lots l where l.chantier_id = c.id
    union all select null::uuid, null::text, 'Hors lot', 1000
  ), vendu as (
    select li.lot_id, sum(li.montant_ht) as ht
    from public.btp_lignes_marche li join public.btp_marches m on m.id = li.marche_id
    where m.chantier_id = c.id and m.statut = 'verifie' and li.nature <> 'option'
    group by li.lot_id
    union all
    select al.lot_id, sum(al.montant_ht)
    from public.btp_avenants_lignes al join public.btp_avenants a on a.id = al.avenant_id
    where a.chantier_id = c.id and a.statut = 'signe' and not al.retiree
    group by al.lot_id
  ), facture as (
    select sl.lot_id, sum(sl.cumule_ht) as ht from public.btp_situations_lignes sl where sl.situation_id = v_situation group by sl.lot_id
  ), mo as (
    select p.lot_id, sum(p.heures) as heures,
           sum(p.heures * private.btp_cout_horaire(p.client_id, p.intervenant_id, p.jour)) as ht,
           sum(case when private.btp_cout_horaire(p.client_id, p.intervenant_id, p.jour) is null then p.heures else 0 end) as sans_cout
    from public.btp_pointages p where p.chantier_id = c.id and p.heures > 0 group by p.lot_id
  ), achats as (
    select x.lot_id, sum(f.montant_ht) as ht
    from public.btp_factures_chantier x join public.filed_factures f on f.id = x.facture_id
    where x.chantier_id = c.id and x.statut = 'rattachee' and f.statut <> 'ecartee'
    group by x.lot_id
  ), par_lot as (
    select l.id, l.code, l.libelle, l.rang,
           coalesce((select sum(v.ht) from vendu v where v.lot_id is not distinct from l.id), 0) as vendu_ht,
           coalesce((select f.ht from facture f where f.lot_id is not distinct from l.id), 0) as facture_ht,
           coalesce((select m.heures from mo m where m.lot_id is not distinct from l.id), 0) as heures,
           coalesce((select m.ht from mo m where m.lot_id is not distinct from l.id), 0) as main_oeuvre_ht,
           coalesce((select m.sans_cout from mo m where m.lot_id is not distinct from l.id), 0) as heures_sans_cout,
           coalesce((select a.ht from achats a where a.lot_id is not distinct from l.id), 0) as achats_ht
    from lots l
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'lot_id', x.id, 'code', x.code, 'libelle', x.libelle,
           'vendu_ht', round(x.vendu_ht, 2), 'facture_ht', round(x.facture_ht, 2), 'heures', x.heures,
           'main_oeuvre_ht', round(x.main_oeuvre_ht, 2), 'heures_sans_cout', x.heures_sans_cout, 'achats_ht', round(x.achats_ht, 2),
           'debourse_ht', round(x.main_oeuvre_ht + x.achats_ht, 2),
           'marge_ht', round(x.facture_ht - x.main_oeuvre_ht - x.achats_ht, 2))
           order by x.rang, x.code collate "C") filter (where x.id is not null or x.vendu_ht + x.facture_ht + x.heures + x.achats_ht <> 0), '[]'::jsonb),
         coalesce(sum(x.vendu_ht), 0), coalesce(sum(x.facture_ht), 0), coalesce(sum(x.main_oeuvre_ht), 0),
         coalesce(sum(x.achats_ht), 0), coalesce(sum(x.heures), 0), coalesce(sum(x.heures_sans_cout), 0)
    into v_lots, v_vendu, v_facture, v_mo, v_achats, v_heures, v_sans_cout
  from par_lot x;

  return jsonb_build_object(
    'vendu_ht', round(v_vendu, 2), 'facture_ht', round(v_facture, 2),
    'heures', v_heures, 'heures_sans_cout', v_sans_cout,
    'main_oeuvre_ht', round(v_mo, 2), 'achats_ht', round(v_achats, 2), 'debourse_ht', round(v_mo + v_achats, 2),
    'marge_ht', round(v_facture - v_mo - v_achats, 2),
    'marge_taux', case when v_facture > 0 then round((v_facture - v_mo - v_achats) / v_facture, 4) end,
    'lots', v_lots);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La semaine à pointer et la rentabilité (l'écran)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_heures_chantier(p_chantier uuid, p_lundi date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_jour date := coalesce(p_lundi, (now() at time zone 'Europe/Paris')::date);
  v_lundi date;
  v_prix boolean;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_pointage(c.client_id, c.entite_id);
  v_lundi := v_jour - (extract(isodow from v_jour)::integer - 1);
  v_prix := private.btp_est_serveur() or private.btp_voit_prix(c.client_id);
  return jsonb_build_object(
    'chantier_id', c.id,
    'lundi', v_lundi,
    'jours', (select jsonb_agg(v_lundi + k order by k) from generate_series(0, 6) k),
    'intervenants', (
      select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'nom', i.nom, 'role_terrain', i.role_terrain, 'actif', i.actif,
                                                   'equipe_id', i.equipe_id, 'equipe_nom', e.nom)
                                order by e.nom collate "C" nulls last, i.nom collate "C"), '[]'::jsonb)
      from public.btp_intervenants i left join public.btp_equipes e on e.client_id = i.client_id and e.id = i.equipe_id
      where i.client_id = c.client_id
        and (i.actif or exists (select 1 from public.btp_pointages p where p.intervenant_id = i.id and p.chantier_id = c.id
                                                                     and p.jour between v_lundi and v_lundi + 6))),
    'equipes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'nom', e.nom) order by e.nom collate "C"), '[]'::jsonb)
      from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'pointages', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'intervenant_id', p.intervenant_id, 'jour', p.jour, 'lot_id', p.lot_id,
                                                   'heures', p.heures, 'note', p.note, 'source', p.source)
                                order by p.jour, p.intervenant_id), '[]'::jsonb)
      from public.btp_pointages p where p.chantier_id = c.id and p.jour between v_lundi and v_lundi + 6 and p.heures > 0),
    'semaine_heures', (select coalesce(sum(p.heures), 0) from public.btp_pointages p where p.chantier_id = c.id and p.jour between v_lundi and v_lundi + 6),
    'total_heures', (select coalesce(sum(p.heures), 0) from public.btp_pointages p where p.chantier_id = c.id),
    'voit_prix', v_prix,
    'cout_defaut', case when v_prix then private.btp_cout_horaire(c.client_id, null, (now() at time zone 'Europe/Paris')::date) end,
    'rentabilite', case when v_prix then private.btp_rentabilite(c.id) end);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_exiger_pointage(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.btp_cout_horaire(uuid, uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_pointer_un(public.btp_chantiers, uuid, date, numeric, uuid, text, text) from public, anon, authenticated;
revoke execute on function private.btp_controler_pointage(public.btp_chantiers, date, numeric, uuid) from public, anon, authenticated;
revoke execute on function private.btp_rentabilite(uuid) from public, anon, authenticated;
grant execute on function private.btp_exiger_pointage(uuid, uuid) to service_role;
grant execute on function private.btp_cout_horaire(uuid, uuid, date) to service_role;
grant execute on function private.btp_pointer_un(public.btp_chantiers, uuid, date, numeric, uuid, text, text) to service_role;
grant execute on function private.btp_controler_pointage(public.btp_chantiers, date, numeric, uuid) to service_role;
grant execute on function private.btp_rentabilite(uuid) to service_role;

revoke execute on function public.btp_pointer(uuid, uuid, date, numeric, uuid, text) from public, anon;
revoke execute on function public.btp_pointer_equipe(uuid, uuid, date, numeric, uuid) from public, anon;
revoke execute on function public.btp_poser_cout_horaire(uuid, uuid, numeric, date) from public, anon;
revoke execute on function public.btp_heures_chantier(uuid, date) from public, anon;
grant execute on function public.btp_pointer(uuid, uuid, date, numeric, uuid, text) to authenticated, service_role;
grant execute on function public.btp_pointer_equipe(uuid, uuid, date, numeric, uuid) to authenticated, service_role;
grant execute on function public.btp_poser_cout_horaire(uuid, uuid, numeric, date) to authenticated, service_role;
grant execute on function public.btp_heures_chantier(uuid, date) to authenticated, service_role;
