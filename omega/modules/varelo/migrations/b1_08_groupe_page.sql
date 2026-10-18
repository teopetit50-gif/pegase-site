-- b1_08 — VARELO : le groupe sur une page — ventes, trésorerie et écarts de chaque société (session B1, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_07.
--
-- CE QUE ÇA CORRIGE (omega/AUDIT-PROMESSES.md, § 2 Varelo, « le groupe sur une page », gros). /secteurs/groupes
-- montre « La page du groupe : ventes, trésorerie et écarts de chaque société, sur une seule page ». Aucune table
-- grp_* ne porte un chiffre d'affaires ni un solde de banque.
--
-- LA SOURCE. La balance générale : le document que TOUS les logiciels comptables sortent (Sage, Cegid, EBP,
-- Pennylane, Quadra…), un compte du plan comptable par ligne avec son solde à une date. Rien à brancher de plus
-- que les balances âgées de b1_04, et le même geste : la DSI ou le cabinet comptable la dépose, en lecture seule.
-- Du plan comptable général (règlement ANC 2014-03) on tire :
--   · ventes      = − Σ soldes des comptes 70 (chiffre d'affaires cumulé depuis le début de l'exercice) ;
--   · résultat    = − Σ soldes des classes 6 et 7 (produits moins charges, cumulés) ;
--   · trésorerie  = Σ soldes des comptes 51 et 53 (banques, dont concours bancaires 519, et caisse).
-- Les chiffres sont SOCIAUX, société par société : les ventes intragroupe ne sont pas éliminées (la carte des
-- réciproques, b1_06, dit ce qui serait à éliminer). L'écran le dit.
--
-- CE QUI EST POSÉ.
--   · public.grp_balances_depots / grp_balances_lignes : une balance générale d'une société à une date d'arrêté,
--     avec le début de son exercice ; la courante = la dernière par arrêté ; rien ne s'efface.
--   · public.grp_objectifs : par société et exercice, l'objectif de ventes de l'année et le plancher de trésorerie
--     (réglés par le gérant, l'administrateur ou la direction financière).
--   · vue public.grp_groupe_page (security_invoker) : par société, la dernière balance — ventes, résultat,
--     trésorerie ; les ventes à la même date l'an dernier (si cette balance a été déposée) et l'écart ; l'objectif
--     au prorata des jours écoulés de l'exercice et l'écart ; la trésorerie sous son plancher ; l'ancienneté.
--   · portes : grp_deposer_balance (gérant, admin), grp_regler_objectif (gérant, admin, valideur DF).
--   · contrôle après chaque dépôt et chaque réglage : une alerte « attention » par société dont la trésorerie
--     passe sous son plancher (clé varelo:tresorerie.<entité>), fermée d'elle-même quand elle remonte.
--   · journal opposable : varelo.balance.depot, varelo.objectif.regle, varelo.tresorerie.plancher.
--   · le point du matin (b1_07) gagne une section « Le groupe ce matin » : trésorerie sous plancher, ventes en
--     retard de plus de 10 % sur l'objectif, balance de plus de 35 jours.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de suppression. Nouvelles tables : revoke
-- all puis SELECT. Fonctions de private : EXECUTE retiré à PUBLIC et anon ; rendu à authenticated pour celles
-- qu'appellent les portes publiques et les vues.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_balances_depots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  arrete_le date not null,
  exercice_debut date not null,
  lignes integer not null default 0,
  desequilibre numeric(16,2) not null default 0,
  source text,
  depose_par uuid,
  depose_le timestamptz not null default clock_timestamp(),
  constraint grp_balances_depots_client_id_id_key unique (client_id, id),
  constraint grp_balances_depots_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_balances_depots_exercice check (exercice_debut <= arrete_le and arrete_le < (exercice_debut + interval '2 years')::date),
  constraint grp_balances_depots_lignes_check check (lignes >= 0),
  constraint grp_balances_depots_source_check check (char_length(source) <= 200)
);
comment on table public.grp_balances_depots is 'VARELO — la balance générale d''une société du groupe arrêtée à une date (soldes cumulés depuis exercice_debut). La courante est la dernière par date d''arrêté. Écrite par grp_deposer_balance seulement.';

create table if not exists public.grp_balances_lignes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  depot_id uuid not null,
  entite_id uuid not null,
  compte text not null,
  libelle text,
  solde numeric(16,2) not null,
  constraint grp_balances_lignes_depot_fkey foreign key (client_id, depot_id) references public.grp_balances_depots(client_id, id) on delete cascade,
  constraint grp_balances_lignes_une_fois unique (depot_id, compte),
  constraint grp_balances_lignes_compte_check check (compte ~ '^[1-9][0-9A-Z]{1,19}$'),
  constraint grp_balances_lignes_libelle_check check (char_length(libelle) <= 200)
);
comment on table public.grp_balances_lignes is 'VARELO — une ligne de balance générale : un compte du plan comptable et son solde (débit − crédit), cumulé depuis le début de l''exercice.';

create table if not exists public.grp_objectifs (
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  exercice_debut date not null,
  ventes_objectif numeric(16,2),
  tresorerie_plancher numeric(16,2),
  motif text,
  regle_par uuid,
  regle_le timestamptz not null default now(),
  constraint grp_objectifs_pkey primary key (client_id, entite_id, exercice_debut),
  constraint grp_objectifs_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_objectifs_ventes_check check (ventes_objectif > 0),
  constraint grp_objectifs_motif_check check (char_length(motif) <= 500)
);
comment on table public.grp_objectifs is 'VARELO — pour une société et un exercice : l''objectif de ventes de l''année et le plancher de trésorerie. Réglés par grp_regler_objectif.';

create index if not exists grp_balances_depots_courant_idx on public.grp_balances_depots (client_id, entite_id, arrete_le desc, depose_le desc);

create or replace trigger grp_balances_depots_tracer after insert or update on public.grp_balances_depots
  for each row execute function private.tracer();
create or replace trigger grp_objectifs_tracer after insert or update on public.grp_objectifs
  for each row execute function private.tracer();

alter table public.grp_balances_depots enable row level security;
alter table public.grp_balances_lignes enable row level security;
alter table public.grp_objectifs enable row level security;
revoke all on public.grp_balances_depots, public.grp_balances_lignes, public.grp_objectifs from anon, authenticated;
grant select on public.grp_balances_depots, public.grp_balances_lignes, public.grp_objectifs to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_balances_depots'
                 and policyname = 'membres lisent les balances de leur perimetre') then
    create policy "membres lisent les balances de leur perimetre" on public.grp_balances_depots
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_balances_lignes'
                 and policyname = 'membres lisent les lignes de balance de leur perimetre') then
    create policy "membres lisent les lignes de balance de leur perimetre" on public.grp_balances_lignes
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_objectifs'
                 and policyname = 'membres lisent les objectifs de leur perimetre') then
    create policy "membres lisent les objectifs de leur perimetre" on public.grp_objectifs
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La page du groupe
-- ─────────────────────────────────────────────────────────────────────────

create or replace view public.grp_groupe_page with (security_invoker = true) as
  with agregats as (
    select d.id as depot_id, d.client_id, d.entite_id, d.arrete_le, d.exercice_debut, d.lignes, d.desequilibre, d.source, d.depose_le,
           -sum(l.solde) filter (where l.compte like '70%') as ventes,
           -sum(l.solde) filter (where l.compte like '6%' or l.compte like '7%') as resultat,
           sum(l.solde) filter (where l.compte like '51%' or l.compte like '53%') as tresorerie
    from public.grp_balances_depots d
    left join public.grp_balances_lignes l on l.client_id = d.client_id and l.depot_id = d.id
    group by d.id
  ), courant as (
    select distinct on (a.client_id, a.entite_id) a.*
    from agregats a
    order by a.client_id, a.entite_id, a.arrete_le desc, a.depose_le desc
  )
  select c.client_id, c.entite_id, e.nom as societe, s.pole_id, p.nom as pole, c.depot_id, c.arrete_le, c.exercice_debut,
         (current_date - c.arrete_le) as age_jours, c.lignes, c.desequilibre, c.source,
         coalesce(c.ventes, 0) as ventes, coalesce(c.resultat, 0) as resultat, coalesce(c.tresorerie, 0) as tresorerie,
         n1.ventes as ventes_n1, n1.arrete_le as arrete_n1,
         case when n1.ventes is not null then coalesce(c.ventes, 0) - n1.ventes end as ecart_n1,
         case when n1.ventes is not null and n1.ventes <> 0 then round((coalesce(c.ventes, 0) - n1.ventes) / abs(n1.ventes) * 100, 1) end as ecart_n1_pct,
         o.ventes_objectif,
         case when o.ventes_objectif is not null then
           round(o.ventes_objectif * (c.arrete_le - c.exercice_debut + 1)
                 / greatest(((c.exercice_debut + interval '1 year')::date - c.exercice_debut), 1), 2) end as objectif_a_date,
         case when o.ventes_objectif is not null then
           coalesce(c.ventes, 0) - round(o.ventes_objectif * (c.arrete_le - c.exercice_debut + 1)
                 / greatest(((c.exercice_debut + interval '1 year')::date - c.exercice_debut), 1), 2) end as ecart_objectif,
         o.tresorerie_plancher,
         (o.tresorerie_plancher is not null and coalesce(c.tresorerie, 0) < o.tresorerie_plancher) as sous_plancher
  from courant c
  join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
  join public.grp_societes s on s.client_id = c.client_id and s.entite_id = c.entite_id
  left join public.grp_poles p on p.client_id = s.client_id and p.id = s.pole_id
  left join public.grp_objectifs o on o.client_id = c.client_id and o.entite_id = c.entite_id and o.exercice_debut = c.exercice_debut
  left join lateral (
    select a.ventes, a.arrete_le from agregats a
    where a.client_id = c.client_id and a.entite_id = c.entite_id and a.arrete_le = (c.arrete_le - interval '1 year')::date
    order by a.depose_le desc limit 1
  ) n1 on true;
comment on view public.grp_groupe_page is 'VARELO — le groupe sur une page : par société, d''après sa dernière balance générale, les ventes (comptes 70), le résultat (classes 6 et 7) et la trésorerie (51, 53) cumulés depuis le début de l''exercice ; l''écart sur l''an dernier à la même date et sur l''objectif au prorata ; la trésorerie sous son plancher. Chiffres sociaux, non consolidés.';

revoke all on public.grp_groupe_page from anon, authenticated;
grant select on public.grp_groupe_page to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Le contrôle de la trésorerie
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_controler_tresorerie(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_levees integer := 0;
  v_closes integer := 0;
begin
  perform set_config('omega.module', 'varelo', true);
  for r in select g.* from public.grp_groupe_page g where g.client_id = p_client and g.sous_plancher loop
    if not exists (select 1 from public.alertes a where a.client_id = p_client and a.acquittee_le is null
                   and a.cle_regroupement = 'varelo:tresorerie.' || r.entite_id::text) then
      if private.lever_alerte_module(p_client, 'varelo', 'attention',
           left(format('Trésorerie de %s sous son plancher au %s', r.societe, to_char(r.arrete_le, 'DD/MM/YYYY')), 200),
           jsonb_build_object('entite_id', r.entite_id, 'societe', r.societe, 'tresorerie', r.tresorerie,
                              'plancher', r.tresorerie_plancher, 'arrete_le', r.arrete_le),
           'tresorerie.' || r.entite_id::text, true) is not null then
        v_levees := v_levees + 1;
        perform private.grp_journal(p_client, 'varelo.tresorerie.plancher', 'grp_societes', r.entite_id::text,
          jsonb_build_object('tresorerie', r.tresorerie, 'plancher', r.tresorerie_plancher, 'arrete_le', r.arrete_le), r.entite_id);
      end if;
    end if;
  end loop;
  for r in
    select a.cle_regroupement from public.alertes a
    where a.client_id = p_client and a.acquittee_le is null and a.cle_regroupement like 'varelo:tresorerie.%'
      and not exists (select 1 from public.grp_groupe_page g where g.client_id = p_client and g.sous_plancher
                      and 'varelo:tresorerie.' || g.entite_id::text = a.cle_regroupement)
  loop
    v_closes := v_closes + private.fermer_alertes_releve(p_client, 'varelo', substr(r.cle_regroupement, char_length('varelo:') + 1),
                                                         'la trésorerie est revenue au-dessus du plancher');
  end loop;
  return jsonb_build_object('alertes_levees', v_levees, 'alertes_closes', v_closes);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Les portes
-- ─────────────────────────────────────────────────────────────────────────

-- Une balance générale. Chaque ligne : {compte, libelle?, solde} ou {compte, debit, credit} (soldes ou mouvements
-- cumulés : seul débit − crédit compte). Les montants à la française sont lus par private.grp_montant (b1_04).
create or replace function private.grp_deposer_balance(p_client uuid, p_entite uuid, p_arrete date, p_exercice_debut date,
                                                       p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_arrete date := coalesce(p_arrete, current_date);
  v_debut date := coalesce(p_exercice_debut, make_date(extract(year from coalesce(p_arrete, current_date))::integer, 1, 1));
  v_lus integer;
  v_depot uuid;
  v_rejetes jsonb := '[]'::jsonb;
  v_retenus integer := 0;
  v_somme numeric := 0;
  v_derniers jsonb;
  x record;
  l jsonb;
  v_compte text;
  v_motif text;
  m_solde numeric; m_debit numeric; m_credit numeric;
  v_ventes numeric; v_treso numeric; v_resultat numeric;
  v_controle jsonb;
begin
  perform private.grp_exiger_installation(p_client);
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if v_arrete > current_date + 1 then
    raise exception 'Une balance ne s''arrête pas dans le futur (%).', to_char(v_arrete, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if v_debut > v_arrete or v_arrete >= (v_debut + interval '2 years')::date then
    raise exception 'Le début de l''exercice (%) précède l''arrêté de moins de deux ans.', to_char(v_debut, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se déposent en tableau JSON.' using errcode = '22023';
  end if;
  v_lus := jsonb_array_length(p_lignes);
  if v_lus > 20000 then
    raise exception 'Un dépôt porte 20 000 lignes au plus (%).', v_lus using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  insert into public.grp_balances_depots (client_id, entite_id, arrete_le, exercice_debut, source, depose_par)
  values (p_client, p_entite, v_arrete, v_debut, left(p_source, 200), (select auth.uid()))
  returning id into v_depot;
  -- un compte en double : la dernière ligne gagne
  select coalesce(jsonb_object_agg(c, n), '{}'::jsonb) into v_derniers
  from (select upper(regexp_replace(e ->> 'compte', '\s', '', 'g')) as c, max(n) as n
        from jsonb_array_elements(p_lignes) with ordinality as t(e, n)
        where jsonb_typeof(e) = 'object' and nullif(btrim(e ->> 'compte'), '') is not null group by 1) d;
  for x in select e as l, n::integer as ligne from jsonb_array_elements(p_lignes) with ordinality as t(e, n) loop
    l := x.l;
    v_motif := null;
    v_compte := case when jsonb_typeof(l) = 'object' then nullif(upper(regexp_replace(coalesce(l ->> 'compte', ''), '\s', '', 'g')), '') end;
    if jsonb_typeof(l) <> 'object' then
      v_motif := 'ligne illisible';
    elsif v_compte is null then
      v_motif := 'numéro de compte manquant';
    elsif v_compte !~ '^[1-9][0-9A-Z]{1,19}$' then
      v_motif := 'numéro de compte illisible';
    elsif (v_derniers ->> v_compte)::integer > x.ligne then
      v_motif := 'doublon dans le lot';
    else
      m_solde := private.grp_montant(l ->> 'solde');
      m_debit := private.grp_montant(l ->> 'debit');
      m_credit := private.grp_montant(l ->> 'credit');
      if m_solde = 'NaN'::numeric or m_debit = 'NaN'::numeric or m_credit = 'NaN'::numeric then
        v_motif := 'montant illisible';
      elsif m_solde is null and m_debit is null and m_credit is null then
        v_motif := 'aucun montant';
      else
        m_solde := coalesce(m_solde, coalesce(m_debit, 0) - coalesce(m_credit, 0));
      end if;
    end if;
    if v_motif is not null then
      v_rejetes := v_rejetes || jsonb_build_array(jsonb_build_object('ligne', x.ligne, 'compte', v_compte, 'motif', v_motif));
      continue;
    end if;
    insert into public.grp_balances_lignes (client_id, depot_id, entite_id, compte, libelle, solde)
    values (p_client, v_depot, p_entite, v_compte, left(nullif(btrim(l ->> 'libelle'), ''), 200), m_solde);
    v_retenus := v_retenus + 1;
    v_somme := v_somme + m_solde;
  end loop;
  update public.grp_balances_depots set lignes = v_retenus, desequilibre = round(v_somme, 2) where id = v_depot;
  select -sum(solde) filter (where compte like '70%'), sum(solde) filter (where compte like '51%' or compte like '53%'),
         -sum(solde) filter (where compte like '6%' or compte like '7%')
    into v_ventes, v_treso, v_resultat
  from public.grp_balances_lignes where depot_id = v_depot;
  perform private.grp_journal(p_client, 'varelo.balance.depot', 'grp_balances_depots', v_depot::text,
    jsonb_build_object('arrete_le', v_arrete, 'exercice_debut', v_debut, 'lus', v_lus, 'retenus', v_retenus,
                       'rejetes', jsonb_array_length(v_rejetes), 'desequilibre', round(v_somme, 2),
                       'ventes', coalesce(v_ventes, 0), 'tresorerie', coalesce(v_treso, 0), 'source', left(p_source, 200)), p_entite);
  v_controle := private.grp_controler_tresorerie(p_client);
  return jsonb_build_object('depot', v_depot, 'arrete_le', v_arrete, 'exercice_debut', v_debut, 'lus', v_lus, 'retenus', v_retenus,
                            'rejetes', v_rejetes, 'desequilibre', round(v_somme, 2), 'ventes', coalesce(v_ventes, 0),
                            'tresorerie', coalesce(v_treso, 0), 'resultat', coalesce(v_resultat, 0), 'controle', v_controle);
end $function$;

-- L'objectif de ventes et le plancher de trésorerie d'une société pour un exercice ; nul = retiré.
create or replace function private.grp_regler_objectif(p_client uuid, p_entite uuid, p_exercice_debut date, p_ventes_objectif numeric,
                                                       p_tresorerie_plancher numeric, p_motif text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant public.grp_objectifs;
begin
  if v_uid is not null and not (
       private.a_un_role(p_client, array['gerant', 'admin'])
       or (private.a_un_role(p_client, array['valideur'])
           and exists (select 1 from public.equipes e
                       where e.client_id = p_client and e.cle = 'direction_financiere' and private.dans_equipe(v_uid, e.id)))) then
    raise exception 'Les objectifs se règlent par le gérant, l''administrateur ou la direction financière.' using errcode = '42501';
  end if;
  if v_uid is not null and not private.voit_entite(p_client, p_entite) then
    raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if p_exercice_debut is null then
    raise exception 'Un objectif vaut pour un exercice : donnez la date de son début.' using errcode = '22023';
  end if;
  if p_ventes_objectif is not null and p_ventes_objectif <= 0 then
    raise exception 'L''objectif de ventes est un montant positif (pour le retirer, laissez-le vide).' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  select * into v_avant from public.grp_objectifs o where o.client_id = p_client and o.entite_id = p_entite and o.exercice_debut = p_exercice_debut;
  insert into public.grp_objectifs as o (client_id, entite_id, exercice_debut, ventes_objectif, tresorerie_plancher, motif, regle_par, regle_le)
  values (p_client, p_entite, p_exercice_debut, round(p_ventes_objectif, 2), round(p_tresorerie_plancher, 2),
          left(nullif(btrim(p_motif), ''), 500), v_uid, now())
  on conflict (client_id, entite_id, exercice_debut) do update set ventes_objectif = excluded.ventes_objectif,
    tresorerie_plancher = excluded.tresorerie_plancher, motif = excluded.motif, regle_par = excluded.regle_par, regle_le = now();
  perform private.grp_journal(p_client, 'varelo.objectif.regle', 'grp_societes', p_entite::text,
    jsonb_build_object('exercice_debut', p_exercice_debut,
                       'avant', case when v_avant.client_id is not null then jsonb_build_object('ventes_objectif', v_avant.ventes_objectif, 'tresorerie_plancher', v_avant.tresorerie_plancher) end,
                       'apres', jsonb_build_object('ventes_objectif', round(p_ventes_objectif, 2), 'tresorerie_plancher', round(p_tresorerie_plancher, 2)),
                       'motif', left(nullif(btrim(p_motif), ''), 500)), p_entite);
  return jsonb_build_object('controle', private.grp_controler_tresorerie(p_client));
end $function$;

create or replace function public.grp_deposer_balance(p_client uuid, p_entite uuid, p_arrete date, p_exercice_debut date,
                                                      p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le dépôt d''une balance générale revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  return private.grp_deposer_balance(p_client, p_entite, p_arrete, p_exercice_debut, p_lignes, p_source);
end $function$;

create or replace function public.grp_regler_objectif(p_client uuid, p_entite uuid, p_exercice_debut date, p_ventes_objectif numeric,
                                                      p_tresorerie_plancher numeric, p_motif text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_regler_objectif(p_client, p_entite, p_exercice_debut, p_ventes_objectif, p_tresorerie_plancher, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Le point du matin : une section de plus (remplace grp_lignes_matin et grp_deposer_points de b1_07)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_lignes_groupe(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
  v jsonb := '[]'::jsonb;
  n integer := 0;
begin
  for r in select g.* from public.grp_groupe_page g where g.client_id = p_client order by g.societe loop
    exit when n >= 15;
    if r.sous_plancher then
      v := v || jsonb_build_object('texte', left(format('%s : trésorerie de %s €, sous son plancher de %s € (balance au %s)', r.societe,
               private.grp_euros(r.tresorerie), private.grp_euros(r.tresorerie_plancher), to_char(r.arrete_le, 'DD/MM')), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
      n := n + 1;
    end if;
    if r.objectif_a_date is not null and r.objectif_a_date > 0 and r.ecart_objectif < -0.10 * r.objectif_a_date then
      v := v || jsonb_build_object('texte', left(format('%s : ventes de %s € au %s, %s € sous l''objectif à date', r.societe,
               private.grp_euros(r.ventes), to_char(r.arrete_le, 'DD/MM'), private.grp_euros(-r.ecart_objectif)), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
      n := n + 1;
    end if;
    if r.age_jours > 35 then
      v := v || jsonb_build_object('texte', left(format('La balance générale de %s date du %s (%s jours) : à redéposer', r.societe,
               to_char(r.arrete_le, 'DD/MM'), r.age_jours), 300),
             'gravite', 'info', 'lien', '/espace/varelo', 'objet_type', 'grp_balances_depots', 'objet_id', r.depot_id::text);
      n := n + 1;
    end if;
  end loop;
  return v;
end $function$;

create or replace function public.grp_ce_matin(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('groupe', private.grp_lignes_groupe(p_client),
                            'contrats', private.grp_lignes_matin(p_client, 'contrats'),
                            'encours', private.grp_lignes_matin(p_client, 'encours'),
                            'reciproques', private.grp_lignes_matin(p_client, 'reciproques'));
end $function$;

create or replace function private.grp_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  s record;
  q record;
  v_jour date;
  v_items jsonb;
  n integer := 0;
begin
  for k in
    select i.client_id,
           coalesce((select e.fuseau from public.entites e where e.client_id = i.client_id and e.principale limit 1), 'Europe/Paris') as fuseau
    from public.grp_installations i
    order by i.client_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    begin
      perform set_config('omega.module', 'varelo', true);
      for s in
        select * from (values ('groupe', 'Le groupe ce matin', 5), ('contrats', 'Contrats à dénoncer', 10),
                              ('encours', 'Encours du groupe', 20), ('reciproques', 'Réciproques intragroupe', 30)) as t(quoi, titre, ordre)
      loop
        v_items := case when s.quoi = 'groupe' then private.grp_lignes_groupe(k.client_id) else private.grp_lignes_matin(k.client_id, s.quoi) end;
        for q in
          select null::uuid as equipe_id, 'gerant'::text as role
          union all
          select e.id, null from public.equipes e
          where e.client_id = k.client_id
            and (e.cle = 'direction_financiere' or (e.cle = 'direction_juridique' and s.quoi = 'contrats')
                 or (e.cle = 'presidence' and s.quoi = 'groupe'))
        loop
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, null, q.equipe_id);
          else
            perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, v_items, null, q.equipe_id,
                                            false, now(), false, s.ordre);
          end if;
        end loop;
      end loop;
      perform private.battre(k.client_id, 'varelo_matin', jsonb_build_object('jour', v_jour), interval '1 day');
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'varelo', 'attention',
        'Le point du matin du groupe n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot', false, null);
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Droits d'exécution
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_controler_tresorerie(uuid) from public, anon, authenticated;
grant execute on function private.grp_controler_tresorerie(uuid) to service_role;
revoke execute on function private.grp_deposer_balance(uuid, uuid, date, date, jsonb, text) from public, anon;
revoke execute on function private.grp_regler_objectif(uuid, uuid, date, numeric, numeric, text) from public, anon;
revoke execute on function private.grp_lignes_groupe(uuid) from public, anon;
grant execute on function private.grp_deposer_balance(uuid, uuid, date, date, jsonb, text) to authenticated, service_role;
grant execute on function private.grp_regler_objectif(uuid, uuid, date, numeric, numeric, text) to authenticated, service_role;
grant execute on function private.grp_lignes_groupe(uuid) to authenticated, service_role;

revoke execute on function public.grp_deposer_balance(uuid, uuid, date, date, jsonb, text) from public, anon;
revoke execute on function public.grp_regler_objectif(uuid, uuid, date, numeric, numeric, text) from public, anon;
grant execute on function public.grp_deposer_balance(uuid, uuid, date, date, jsonb, text) to authenticated, service_role;
grant execute on function public.grp_regler_objectif(uuid, uuid, date, numeric, numeric, text) to authenticated, service_role;
revoke execute on function private.grp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.grp_deposer_points(timestamp with time zone) to service_role;
