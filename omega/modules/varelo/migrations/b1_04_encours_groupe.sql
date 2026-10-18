-- b1_04 — VARELO : l'encours du groupe par tiers et son plafond (session B1, vague 3, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_01 à b1_03.
--
-- CE QUE ÇA CORRIGE (omega/NOTES-B1.md, « Vague 3 », manque n° 1). Le référentiel sait que le code
-- C001 de la société A et le code CLHY de la société B sont le même client ; il ne sait rien de ce
-- que ce client DOIT au groupe. La page /secteurs/groupes promet « un seuil d'encours » écrit une fois
-- pour le groupe et « le groupe sur une page » ; aucune table grp_* ne porte un montant.
--
-- CE QUI EST POSÉ.
--   · public.grp_encours_depots  : un dépôt = la balance âgée d'UNE société, d'UNE nature (clients ou
--     fournisseurs), arrêtée à une date. Le dépôt courant d'une société est le dernier par date
--     d'arrêté (puis par heure de dépôt) : rien ne s'efface, un nouveau dépôt remplace l'ancien à la lecture.
--   · public.grp_encours_lignes  : une ligne par code local : non échu, échu 1–30, 31–60, 61–90, > 90 j,
--     échu sans ancienneté connue ; total et échu calculés.
--   · public.grp_encours_plafonds : le plafond d'encours d'un CLIENT du groupe (objet C-…), total et
--     échu, réglé par le gérant, l'administrateur ou la direction financière.
--   · vues (security_invoker) : grp_encours_courant (le dépôt courant de chaque société),
--     grp_encours_par_code (chaque ligne courante avec son code, son objet du groupe et sa société),
--     grp_encours_groupe (un objet du groupe : total, échu, sociétés, plafond, dépassement).
--   · portes : grp_deposer_encours (gérant, admin : la DSI dépose l'export, comme grp_deposer_codes) ;
--     grp_regler_plafond (gérant, admin, ou valideur de la direction financière).
--   · un dépôt inscrit au référentiel les codes qu'il ne connaît pas encore (s'ils ont un nom), par
--     private.grp_deposer_codes, qui dépose le travail de rapprochement : la balance âgée nourrit aussi
--     le référentiel ; un code déjà connu n'est jamais réécrit par un dépôt d'encours.
--   · contrôle après chaque dépôt et chaque plafond : un client hors intragroupe au-dessus de son
--     plafond lève UNE alerte « attention » visible du client (clé varelo:encours.<objet>), close d'elle-même
--     quand l'encours repasse dessous ; chaque dépassement nouveau est journalisé.
--   · journal opposable : varelo.encours.depot, varelo.encours.plafond, varelo.encours.depassement.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de suppression de table ni de
-- ligne (un plafond retiré passe actif = false). Nouvelles tables : revoke all d'anon et authenticated,
-- puis les GRANT en face des politiques. Nouvelles fonctions de private : EXECUTE retiré à PUBLIC et anon,
-- rendu à authenticated pour les seules qu'appellent les portes publiques SECURITY INVOKER
-- (à inscrire dans omega/a5_01_liste_figee.txt : grp_deposer_encours, grp_regler_plafond).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_encours_depots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  nature text not null,
  arrete_le date not null,
  lignes integer not null default 0,
  total numeric(16,2) not null default 0,
  echu numeric(16,2) not null default 0,
  devise text not null default 'EUR',
  source text,
  depose_par uuid,
  depose_le timestamptz not null default now(),
  constraint grp_encours_depots_client_id_id_key unique (client_id, id),
  constraint grp_encours_depots_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_encours_depots_nature_check check (nature in ('client', 'fournisseur')),
  constraint grp_encours_depots_lignes_check check (lignes >= 0),
  constraint grp_encours_depots_devise_check check (devise ~ '^[A-Z]{3}$'),
  constraint grp_encours_depots_source_check check (char_length(source) <= 200)
);
comment on table public.grp_encours_depots is 'VARELO — la balance âgée d''une société du groupe (clients ou fournisseurs) arrêtée à une date ; le dépôt courant est le dernier par date d''arrêté. Écrit par grp_deposer_encours seulement.';

create table if not exists public.grp_encours_lignes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  depot_id uuid not null,
  entite_id uuid not null,
  nature text not null,
  code_local text not null,
  non_echu numeric(16,2) not null default 0,
  echu_30 numeric(16,2) not null default 0,
  echu_60 numeric(16,2) not null default 0,
  echu_90 numeric(16,2) not null default 0,
  echu_plus numeric(16,2) not null default 0,
  echu_autre numeric(16,2) not null default 0,
  total numeric(16,2) generated always as (non_echu + echu_30 + echu_60 + echu_90 + echu_plus + echu_autre) stored,
  echu numeric(16,2) generated always as (echu_30 + echu_60 + echu_90 + echu_plus + echu_autre) stored,
  constraint grp_encours_lignes_depot_fkey foreign key (client_id, depot_id) references public.grp_encours_depots(client_id, id) on delete cascade,
  constraint grp_encours_lignes_une_fois unique (depot_id, code_local),
  constraint grp_encours_lignes_nature_check check (nature in ('client', 'fournisseur')),
  constraint grp_encours_lignes_code_local_check check (char_length(code_local) between 1 and 80)
);
comment on table public.grp_encours_lignes is 'VARELO — une ligne de balance âgée : ce qu''un code local doit (client) ou à qui la société doit (fournisseur), par tranche d''ancienneté. echu_autre : échu dont l''export ne donne pas l''ancienneté.';

create table if not exists public.grp_encours_plafonds (
  client_id uuid not null references public.clients(id) on delete cascade,
  objet_id uuid not null,
  nature text not null default 'client',
  plafond numeric(16,2) not null,
  plafond_echu numeric(16,2),
  actif boolean not null default true,
  motif text,
  regle_par uuid,
  regle_le timestamptz not null default now(),
  constraint grp_encours_plafonds_pkey primary key (client_id, objet_id),
  constraint grp_encours_plafonds_objet_fkey foreign key (objet_id, client_id, nature) references public.grp_ref_objets(id, client_id, nature),
  constraint grp_encours_plafonds_nature_check check (nature = 'client'),
  constraint grp_encours_plafonds_plafond_check check (plafond > 0),
  constraint grp_encours_plafonds_plafond_echu_check check (plafond_echu >= 0),
  constraint grp_encours_plafonds_motif_check check (char_length(motif) <= 500)
);
comment on table public.grp_encours_plafonds is 'VARELO — le plafond d''encours d''un client du groupe, toutes sociétés confondues (total et, s''il est posé, échu). Réglé par grp_regler_plafond ; retiré = actif false.';

create index if not exists grp_encours_depots_courant_idx on public.grp_encours_depots (client_id, entite_id, nature, arrete_le desc, depose_le desc);
create index if not exists grp_encours_lignes_code_idx on public.grp_encours_lignes (client_id, entite_id, nature, code_local);

create or replace trigger grp_encours_depots_tracer after insert or update on public.grp_encours_depots
  for each row execute function private.tracer();
create or replace trigger grp_encours_plafonds_tracer after insert or update on public.grp_encours_plafonds
  for each row execute function private.tracer();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Droits et politiques : lecture dans le périmètre, écriture par les portes seules
-- ─────────────────────────────────────────────────────────────────────────

alter table public.grp_encours_depots enable row level security;
alter table public.grp_encours_lignes enable row level security;
alter table public.grp_encours_plafonds enable row level security;

revoke all on public.grp_encours_depots from anon, authenticated;
revoke all on public.grp_encours_lignes from anon, authenticated;
revoke all on public.grp_encours_plafonds from anon, authenticated;
grant select on public.grp_encours_depots to authenticated;
grant select on public.grp_encours_lignes to authenticated;
grant select on public.grp_encours_plafonds to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_encours_depots'
                 and policyname = 'membres lisent les depots d''encours de leur perimetre') then
    create policy "membres lisent les depots d'encours de leur perimetre" on public.grp_encours_depots
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_encours_lignes'
                 and policyname = 'membres lisent les lignes d''encours de leur perimetre') then
    create policy "membres lisent les lignes d'encours de leur perimetre" on public.grp_encours_lignes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_encours_plafonds'
                 and policyname = 'membres lisent les plafonds d''encours') then
    create policy "membres lisent les plafonds d'encours" on public.grp_encours_plafonds
      for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Vues (security_invoker : la RLS de la personne s'applique)
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.grp_encours_courant with (security_invoker = true) as
  select distinct on (d.client_id, d.entite_id, d.nature)
         d.id as depot_id, d.client_id, d.entite_id, e.nom as societe, d.nature, d.arrete_le,
         (current_date - d.arrete_le) as age_jours, d.lignes, d.total, d.echu, d.devise, d.source, d.depose_le
  from public.grp_encours_depots d
  join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  order by d.client_id, d.entite_id, d.nature, d.arrete_le desc, d.depose_le desc;
comment on view public.grp_encours_courant is 'VARELO — le dépôt d''encours courant de chaque société, par nature (le dernier par date d''arrêté).';

create or replace view public.grp_encours_par_code with (security_invoker = true) as
  select l.id as ligne_id, l.client_id, l.nature, l.entite_id, d.societe, d.arrete_le, d.age_jours,
         l.code_local, c.id as code_id, c.nom_local, c.etat, o.id as objet_id, o.code_groupe, o.nom_groupe,
         coalesce(o.intragroupe, false) as intragroupe,
         l.non_echu, l.echu_30, l.echu_60, l.echu_90, l.echu_plus, l.echu_autre, l.total, l.echu
  from public.grp_encours_courant d
  join public.grp_encours_lignes l on l.client_id = d.client_id and l.depot_id = d.depot_id
  left join public.grp_ref_codes c on c.client_id = l.client_id and c.entite_id = l.entite_id
                                  and c.nature = l.nature and c.code_local = l.code_local
  left join public.grp_ref_objets o on o.client_id = c.client_id and o.id = c.objet_id;
comment on view public.grp_encours_par_code is 'VARELO — chaque ligne d''encours courante avec son code du référentiel, son objet du groupe et sa société ; objet_id nul = code pas encore rapproché.';

create or replace view public.grp_encours_groupe with (security_invoker = true) as
  select p.client_id, p.nature, p.objet_id, p.code_groupe, p.nom_groupe, p.intragroupe,
         count(distinct p.entite_id)::integer as societes,
         count(*)::integer as codes,
         sum(p.total) as total, sum(p.non_echu) as non_echu, sum(p.echu) as echu,
         sum(p.echu_plus) as echu_plus_90,
         min(p.arrete_le) as plus_ancien_arrete,
         bool_or(p.etat = 'propose') as provisoire,
         f.plafond, f.plafond_echu,
         coalesce(sum(p.total) > f.plafond or (f.plafond_echu is not null and sum(p.echu) > f.plafond_echu), false) as depasse
  from public.grp_encours_par_code p
  left join public.grp_encours_plafonds f on f.client_id = p.client_id and f.objet_id = p.objet_id and f.actif
  where p.objet_id is not null
  group by p.client_id, p.nature, p.objet_id, p.code_groupe, p.nom_groupe, p.intragroupe, f.plafond, f.plafond_echu;
comment on view public.grp_encours_groupe is 'VARELO — l''encours d''un client ou d''un fournisseur du groupe, toutes sociétés confondues (celles du périmètre de la personne), avec son plafond et le dépassement. provisoire : un des codes n''est que proposé sur cet objet, en attente du référent.';

revoke all on public.grp_encours_courant, public.grp_encours_par_code, public.grp_encours_groupe from anon, authenticated;
grant select on public.grp_encours_courant, public.grp_encours_par_code, public.grp_encours_groupe to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Fonctions
-- ─────────────────────────────────────────────────────────────────────────

-- Un montant tel qu'un logiciel français l'exporte : « 1 234,56 », « 1.234,56 », « 1,234.56 », « -12,5 »,
-- « 12,50- », « (12,50) », « 1 234,56 € ». Vide ou absent : null ; illisible : 'NaN'.
create or replace function private.grp_montant(p text)
 returns numeric
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  s text := btrim(coalesce(p, ''));
  negatif boolean := false;
  i_virgule integer;
  i_point integer;
begin
  if s = '' then
    return null;
  end if;
  s := regexp_replace(s, '[\s  €]|EUR', '', 'gi');
  if s ~ '^\(.*\)$' then
    negatif := true; s := substr(s, 2, char_length(s) - 2);
  elsif s ~ '-$' then
    negatif := true; s := left(s, -1);
  end if;
  if s ~ '^-' then
    negatif := not negatif; s := substr(s, 2);
  elsif s ~ '^\+' then
    s := substr(s, 2);
  end if;
  i_virgule := case when position(',' in s) > 0 then char_length(s) - position(',' in reverse(s)) + 1 else 0 end;
  i_point := case when position('.' in s) > 0 then char_length(s) - position('.' in reverse(s)) + 1 else 0 end;
  if position(',' in s) > 0 and position('.' in s) > 0 then
    -- le dernier séparateur est le décimal, l'autre groupe les milliers
    if i_virgule > i_point then
      s := replace(replace(s, '.', ''), ',', '.');
    else
      s := replace(s, ',', '');
    end if;
  elsif position(',' in s) > 0 then
    s := replace(s, ',', '.');
  end if;
  if s !~ '^[0-9]+(\.[0-9]+)?$' or s ~ '\..*\.' then
    return 'NaN'::numeric;
  end if;
  if char_length(split_part(s, '.', 1)) > 14 then
    return 'NaN'::numeric;
  end if;
  return round(case when negatif then -s::numeric else s::numeric end, 2);
end $function$;

-- Le contrôle des plafonds d'un groupe : lève une alerte par client au-dessus de son plafond, ferme
-- celles des clients revenus dessous. Appelé par les portes (définisseur : voit tout le groupe).
create or replace function private.grp_controler_encours(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_levees integer := 0;
  v_closes integer := 0;
  v_depasses integer := 0;
  v_id uuid;
begin
  perform set_config('omega.module', 'varelo', true);
  for r in
    select g.* from public.grp_encours_groupe g
    where g.client_id = p_client and g.nature = 'client' and g.depasse and not g.intragroupe
  loop
    v_depasses := v_depasses + 1;
    if not exists (select 1 from public.alertes a
                   where a.client_id = p_client and a.acquittee_le is null
                     and a.cle_regroupement = 'varelo:encours.' || r.objet_id::text) then
      v_id := private.lever_alerte_module(p_client, 'varelo', 'attention',
        left(format('Encours du groupe : %s dépasse son plafond', r.nom_groupe), 200),
        jsonb_build_object('objet_id', r.objet_id, 'code_groupe', r.code_groupe, 'nom_groupe', r.nom_groupe,
                           'total', r.total, 'plafond', r.plafond, 'echu', r.echu, 'plafond_echu', r.plafond_echu,
                           'societes', r.societes, 'plus_ancien_arrete', r.plus_ancien_arrete),
        'encours.' || r.objet_id::text, true);
      if v_id is not null then
        v_levees := v_levees + 1;
        perform private.grp_journal(p_client, 'varelo.encours.depassement', 'grp_ref_objets', r.objet_id::text,
          jsonb_build_object('code_groupe', r.code_groupe, 'total', r.total, 'plafond', r.plafond,
                             'echu', r.echu, 'plafond_echu', r.plafond_echu, 'societes', r.societes));
      end if;
    end if;
  end loop;
  for r in
    select a.cle_regroupement from public.alertes a
    where a.client_id = p_client and a.acquittee_le is null and a.cle_regroupement like 'varelo:encours.%'
      and not exists (select 1 from public.grp_encours_groupe g
                      where g.client_id = p_client and g.nature = 'client' and g.depasse and not g.intragroupe
                        and 'varelo:encours.' || g.objet_id::text = a.cle_regroupement)
  loop
    v_closes := v_closes + private.fermer_alertes_releve(p_client, 'varelo', substr(r.cle_regroupement, char_length('varelo:') + 1),
                                                         'l''encours du groupe est revenu sous le plafond');
  end loop;
  return jsonb_build_object('depassements', v_depasses, 'alertes_levees', v_levees, 'alertes_closes', v_closes);
end $function$;

-- Le dépôt d'une balance âgée. Chaque ligne : {code, nom?, siren?, … , montants}. Montants reconnus :
-- non_echu, echu_30, echu_60, echu_90, echu_plus (tranches) ; total (ou solde) et echu quand l'export
-- ne ventile pas. Les autres clés (siren, tva, iban, adresse…) servent à inscrire un code inconnu.
create or replace function private.grp_deposer_encours(p_client uuid, p_entite uuid, p_nature text, p_arrete date,
                                                       p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_arrete date := coalesce(p_arrete, current_date);
  v_lus integer;
  v_depot uuid;
  v_rejetes jsonb := '[]'::jsonb;
  v_inconnus jsonb := '[]'::jsonb;
  v_sans_nom integer := 0;
  v_inscription jsonb;
  v_controle jsonb;
  v_retenus integer := 0;
  v_total numeric := 0;
  v_echu numeric := 0;
  x record;
  l jsonb;
  v_code text;
  v_motif text;
  m_non_echu numeric; m_30 numeric; m_60 numeric; m_90 numeric; m_plus numeric; m_total numeric; m_echu numeric;
  m_autre numeric;
  v_tranches boolean;
  v_champ text;
  v_cles constant text[] := array['non_echu', 'echu_30', 'echu_60', 'echu_90', 'echu_plus', 'total', 'solde', 'echu'];
  v_derniers jsonb;
begin
  perform private.grp_exiger_installation(p_client);
  if p_nature is null or p_nature not in ('client', 'fournisseur') then
    raise exception 'Une balance âgée se dépose pour les clients ou pour les fournisseurs (%).', coalesce(p_nature, 'vide') using errcode = '22023';
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if v_arrete > current_date + 1 then
    raise exception 'Une balance âgée ne s''arrête pas dans le futur (%).', to_char(v_arrete, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se déposent en tableau JSON.' using errcode = '22023';
  end if;
  v_lus := jsonb_array_length(p_lignes);
  if v_lus > 20000 then
    raise exception 'Un dépôt porte 20 000 lignes au plus (%).', v_lus using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  perform pg_advisory_xact_lock(hashtextextended('varelo.referentiel:' || p_client::text, 0));

  insert into public.grp_encours_depots (client_id, entite_id, nature, arrete_le, source, depose_par)
  values (p_client, p_entite, p_nature, v_arrete, left(p_source, 200), (select auth.uid()))
  returning id into v_depot;

  -- la dernière ligne d'un code gagne (comme grp_deposer_codes)
  select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) into v_derniers
  from (select nullif(btrim(e ->> 'code'), '') as c, max(n) as n
        from jsonb_array_elements(p_lignes) with ordinality as t(e, n)
        where jsonb_typeof(e) = 'object' and nullif(btrim(e ->> 'code'), '') is not null
        group by 1) d;
  for x in select e as l, n::integer as ligne from jsonb_array_elements(p_lignes) with ordinality as t(e, n) loop
    l := x.l;
    v_motif := null;
    v_code := case when jsonb_typeof(l) = 'object' then nullif(btrim(l ->> 'code'), '') end;
    if jsonb_typeof(l) <> 'object' then
      v_motif := 'ligne illisible';
    elsif v_code is null then
      v_motif := 'code local manquant';
    elsif char_length(v_code) > 80 then
      v_motif := 'code local trop long (80 caractères au plus)';
    elsif (v_derniers ->> v_code)::integer > x.ligne then
      v_motif := 'doublon dans le lot';
    elsif not exists (select 1 from unnest(v_cles) k where nullif(btrim(l ->> k), '') is not null) then
      v_motif := 'aucun montant';
    else
      foreach v_champ in array v_cles loop
        if private.grp_montant(l ->> v_champ) = 'NaN'::numeric then
          v_motif := format('montant illisible (%s)', v_champ);
          exit;
        end if;
      end loop;
    end if;
    if v_motif is null then
      m_30 := private.grp_montant(l ->> 'echu_30');
      m_60 := private.grp_montant(l ->> 'echu_60');
      m_90 := private.grp_montant(l ->> 'echu_90');
      m_plus := private.grp_montant(l ->> 'echu_plus');
      m_non_echu := private.grp_montant(l ->> 'non_echu');
      m_total := coalesce(private.grp_montant(l ->> 'total'), private.grp_montant(l ->> 'solde'));
      m_echu := private.grp_montant(l ->> 'echu');
      v_tranches := coalesce(m_30, m_60, m_90, m_plus) is not null;
      m_30 := coalesce(m_30, 0); m_60 := coalesce(m_60, 0); m_90 := coalesce(m_90, 0); m_plus := coalesce(m_plus, 0);
      -- l'échu qui n'est pas ventilé par tranche
      m_autre := case when m_echu is null then 0 else m_echu - (m_30 + m_60 + m_90 + m_plus) end;
      if v_tranches and abs(m_autre) < 0.01 then
        m_autre := 0;
      end if;
      if v_tranches and m_autre < 0 then
        v_motif := 'échu inférieur à la somme de ses tranches';
      elsif m_non_echu is null then
        -- sans total, ce qui n'est pas échu vaut zéro ; avec un total, c'est le reste
        m_non_echu := case when m_total is null then 0 else m_total - (m_30 + m_60 + m_90 + m_plus + m_autre) end;
      elsif m_total is not null and abs(m_total - (m_non_echu + m_30 + m_60 + m_90 + m_plus + m_autre)) >= 0.01 then
        v_motif := 'total différent de la somme de ses tranches';
      end if;
    end if;
    if v_motif is not null then
      v_rejetes := v_rejetes || jsonb_build_array(jsonb_build_object('ligne', x.ligne, 'code', v_code, 'motif', v_motif));
      continue;
    end if;
    insert into public.grp_encours_lignes (client_id, depot_id, entite_id, nature, code_local,
                                           non_echu, echu_30, echu_60, echu_90, echu_plus, echu_autre)
    values (p_client, v_depot, p_entite, p_nature, v_code, m_non_echu, m_30, m_60, m_90, m_plus, m_autre);
    v_retenus := v_retenus + 1;
    v_total := v_total + m_non_echu + m_30 + m_60 + m_90 + m_plus + m_autre;
    v_echu := v_echu + m_30 + m_60 + m_90 + m_plus + m_autre;
    if not exists (select 1 from public.grp_ref_codes c
                   where c.client_id = p_client and c.entite_id = p_entite and c.nature = p_nature and c.code_local = v_code) then
      if nullif(btrim(coalesce(l ->> 'nom', l ->> 'designation')), '') is not null then
        v_inconnus := v_inconnus || jsonb_build_array(l - v_cles);
      else
        v_sans_nom := v_sans_nom + 1;
      end if;
    end if;
  end loop;

  update public.grp_encours_depots set lignes = v_retenus, total = v_total, echu = v_echu where id = v_depot;
  if jsonb_array_length(v_inconnus) > 0 then
    v_inscription := private.grp_deposer_codes(p_client, p_entite, p_nature, v_inconnus,
                                               left('balance âgée' || coalesce(' : ' || p_source, ''), 200));
  end if;
  perform private.grp_journal(p_client, 'varelo.encours.depot', 'grp_encours_depots', v_depot::text,
    jsonb_build_object('nature', p_nature, 'arrete_le', v_arrete, 'lus', v_lus, 'retenus', v_retenus,
                       'rejetes', jsonb_array_length(v_rejetes), 'total', v_total, 'echu', v_echu,
                       'codes_inscrits', coalesce((v_inscription ->> 'nouveaux')::integer, 0),
                       'codes_inconnus_sans_nom', v_sans_nom, 'source', left(p_source, 200)), p_entite);
  v_controle := private.grp_controler_encours(p_client);
  return jsonb_build_object('depot', v_depot, 'arrete_le', v_arrete, 'lus', v_lus, 'retenus', v_retenus,
                            'total', v_total, 'echu', v_echu, 'rejetes', v_rejetes,
                            'codes_inscrits', coalesce((v_inscription ->> 'nouveaux')::integer, 0),
                            'codes_inconnus_sans_nom', v_sans_nom, 'controle', v_controle);
end $function$;

-- Le plafond d'encours d'un client du groupe. p_plafond nul : le plafond est retiré (actif = false).
create or replace function private.grp_regler_plafond(p_objet uuid, p_plafond numeric, p_plafond_echu numeric default null::numeric,
                                                      p_motif text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  o public.grp_ref_objets;
  v_uid uuid := (select auth.uid());
  v_avant public.grp_encours_plafonds;
  v_g record;
  v_controle jsonb;
begin
  select * into o from public.grp_ref_objets where id = p_objet;
  if o.id is null or (v_uid is not null and o.client_id not in (select private.mes_clients())) then
    raise exception 'Objet du groupe introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null and not (
       private.a_un_role(o.client_id, array['gerant', 'admin'])
       or (private.a_un_role(o.client_id, array['valideur'])
           and exists (select 1 from public.equipes e
                       where e.client_id = o.client_id and e.cle = 'direction_financiere' and private.dans_equipe(v_uid, e.id)))) then
    raise exception 'Le plafond d''encours se règle par le gérant, l''administrateur ou la direction financière.' using errcode = '42501';
  end if;
  if o.nature <> 'client' then
    raise exception 'Un plafond d''encours se pose sur un client du groupe (C-…), pas sur %.', o.code_groupe using errcode = '22023';
  end if;
  if o.statut <> 'actif' then
    raise exception 'Cet objet a été fusionné dans un autre : posez le plafond sur l''objet qui l''a reçu.' using errcode = '22023';
  end if;
  if o.intragroupe then
    raise exception 'Un client intragroupe n''a pas de plafond d''encours : c''est une société du groupe.' using errcode = '22023';
  end if;
  if p_plafond is not null and p_plafond <= 0 then
    raise exception 'Un plafond d''encours est un montant positif (pour le retirer, laissez-le vide).' using errcode = '22023';
  end if;
  if p_plafond_echu is not null and (p_plafond_echu < 0 or p_plafond is null) then
    raise exception 'Le plafond de l''échu est un montant positif, posé avec le plafond total.' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  select * into v_avant from public.grp_encours_plafonds f where f.client_id = o.client_id and f.objet_id = o.id;
  if p_plafond is null then
    update public.grp_encours_plafonds set actif = false, motif = left(nullif(btrim(p_motif), ''), 500), regle_par = v_uid, regle_le = now()
    where client_id = o.client_id and objet_id = o.id;
  else
    insert into public.grp_encours_plafonds as f (client_id, objet_id, nature, plafond, plafond_echu, actif, motif, regle_par, regle_le)
    values (o.client_id, o.id, 'client', round(p_plafond, 2), round(p_plafond_echu, 2), true, left(nullif(btrim(p_motif), ''), 500), v_uid, now())
    on conflict (client_id, objet_id) do update set plafond = excluded.plafond, plafond_echu = excluded.plafond_echu, actif = true,
      motif = excluded.motif, regle_par = excluded.regle_par, regle_le = now();
  end if;
  perform private.grp_journal(o.client_id, 'varelo.encours.plafond', 'grp_ref_objets', o.id::text,
    jsonb_build_object('code_groupe', o.code_groupe,
                       'avant', case when v_avant.actif then jsonb_build_object('plafond', v_avant.plafond, 'plafond_echu', v_avant.plafond_echu) end,
                       'apres', case when p_plafond is not null then jsonb_build_object('plafond', round(p_plafond, 2), 'plafond_echu', round(p_plafond_echu, 2)) end,
                       'motif', left(nullif(btrim(p_motif), ''), 500)));
  v_controle := private.grp_controler_encours(o.client_id);
  select g.total, g.echu, g.depasse into v_g from public.grp_encours_groupe g where g.client_id = o.client_id and g.objet_id = o.id;
  return jsonb_build_object('objet', o.id, 'code_groupe', o.code_groupe, 'plafond', round(p_plafond, 2), 'plafond_echu', round(p_plafond_echu, 2),
                            'total', coalesce(v_g.total, 0), 'echu', coalesce(v_g.echu, 0), 'depasse', coalesce(v_g.depasse, false),
                            'controle', v_controle);
end $function$;

-- Façades publiques (SECURITY INVOKER, comme b1_01) : le rôle est contrôlé quand auth.uid() est posé.
create or replace function public.grp_deposer_encours(p_client uuid, p_entite uuid, p_nature text, p_arrete date,
                                                      p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le dépôt d''une balance âgée revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  return private.grp_deposer_encours(p_client, p_entite, p_nature, p_arrete, p_lignes, p_source);
end $function$;

create or replace function public.grp_regler_plafond(p_objet uuid, p_plafond numeric, p_plafond_echu numeric default null::numeric,
                                                     p_motif text default null::text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.grp_regler_plafond(p_objet, p_plafond, p_plafond_echu, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Droits d'exécution
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_montant(text) from public, anon, authenticated;
revoke execute on function private.grp_controler_encours(uuid) from public, anon, authenticated;
revoke execute on function private.grp_deposer_encours(uuid, uuid, text, date, jsonb, text) from public, anon;
revoke execute on function private.grp_regler_plafond(uuid, numeric, numeric, text) from public, anon;
grant execute on function private.grp_montant(text) to service_role;
grant execute on function private.grp_controler_encours(uuid) to service_role;
grant execute on function private.grp_deposer_encours(uuid, uuid, text, date, jsonb, text) to authenticated, service_role;
grant execute on function private.grp_regler_plafond(uuid, numeric, numeric, text) to authenticated, service_role;

revoke execute on function public.grp_deposer_encours(uuid, uuid, text, date, jsonb, text) from public, anon;
revoke execute on function public.grp_regler_plafond(uuid, numeric, numeric, text) from public, anon;
grant execute on function public.grp_deposer_encours(uuid, uuid, text, date, jsonb, text) to authenticated, service_role;
grant execute on function public.grp_regler_plafond(uuid, numeric, numeric, text) to authenticated, service_role;
