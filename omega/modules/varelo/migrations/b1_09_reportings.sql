-- b1_09 — VARELO : les reportings dus — qui doit quoi, à qui, pour quand, en retard (session B1, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_08.
--
-- CE QUE ÇA CORRIGE (omega/AUDIT-PROMESSES.md, § 2 Varelo, « reportings dus », moyen). /secteurs/groupes promet
-- « Les reportings dus : les reportings attendus par chaque marque, rangés par échéance ». Un groupe de
-- distribution doit chaque mois à chaque marque qu'il représente ses ventes, son stock, ses prévisions ; à sa
-- banque ses covenants ; à ses actionnaires son tableau de bord. Rien dans grp_* ne les porte.
--
-- CE QUI EST POSÉ.
--   · public.grp_reportings : une obligation de reporting d'une société du groupe — à qui (une marque, une
--     banque, un organisme ; un objet du référentiel si le destinataire y est), quoi, à quelle périodicité
--     (hebdomadaire, mensuelle, trimestrielle, annuelle), combien de jours après la fin de la période, par
--     quel canal, sous la responsabilité de qui. Suivie tant qu'elle est active (sinon : arrêtée, rien ne s'efface).
--   · public.grp_reportings_echeances : une échéance par période (calendaire), créée d'avance jusqu'à 45 jours
--     (private.grp_generer_echeances, au dépôt d'une obligation et chaque nuit), à faire → envoyé | dispensé.
--   · vue public.grp_reportings_dus (security_invoker) : chaque échéance avec sa société, son destinataire, son
--     responsable et son état (en_retard, aujourdhui, semaine ≤ 7 j, a_venir, envoye, envoye_en_retard, dispense).
--   · portes : grp_enregistrer_reporting (créer ou corriger ; toute personne de la société sauf lecteur),
--     grp_marquer_reporting (envoyé ou dispensé, à telle date ; le responsable, le gérant, l'administrateur ou un
--     valideur), grp_arreter_reporting (gérant, admin).
--   · une alerte « attention » par échéance en retard (clé varelo:reporting.<échéance>), fermée à l'envoi ;
--     journal varelo.reporting.enregistre | envoye | dispense | arrete.
--   · le point du matin gagne « Reportings dus » (en retard, puis dans les 7 jours ; au gérant, à la direction
--     financière, à la direction des opérations, et au responsable nommé) : grp_ce_matin et grp_deposer_points
--     remplacés (create or replace) ; cron varelo-reportings chaque nuit (création des échéances, alertes).
--
-- Règles de pose : create … if not exists / create or replace ; jamais de suppression. Nouvelles tables : revoke
-- all puis SELECT. Fonctions de private : EXECUTE retiré à PUBLIC et anon.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_reportings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  destinataire text not null,
  nature text,
  objet_id uuid,
  intitule text not null,
  periodicite text not null default 'mensuelle',
  delai_jours smallint not null default 10,
  debut date not null default current_date,
  canal text not null default 'courriel',
  responsable_id uuid,
  notes text,
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint grp_reportings_client_id_id_key unique (client_id, id),
  constraint grp_reportings_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_reportings_objet_fkey foreign key (objet_id, client_id, nature) references public.grp_ref_objets(id, client_id, nature),
  constraint grp_reportings_responsable_fkey foreign key (responsable_id, client_id) references public.comptes(user_id, client_id) on delete set null (responsable_id),
  constraint grp_reportings_nature_check check (nature in ('fournisseur', 'client')),
  constraint grp_reportings_objet_nature check (objet_id is null or nature is not null),
  constraint grp_reportings_destinataire_check check (char_length(btrim(destinataire)) between 1 and 200),
  constraint grp_reportings_intitule_check check (char_length(btrim(intitule)) between 1 and 200),
  constraint grp_reportings_periodicite_check check (periodicite in ('hebdomadaire', 'mensuelle', 'trimestrielle', 'annuelle')),
  constraint grp_reportings_delai_check check (delai_jours between 0 and 180),
  constraint grp_reportings_canal_check check (canal in ('portail', 'courriel', 'extranet', 'courrier', 'autre')),
  constraint grp_reportings_notes_check check (char_length(notes) <= 2000)
);
comment on table public.grp_reportings is 'VARELO — une obligation de reporting d''une société du groupe envers un destinataire (marque, banque, organisme) : périodicité, délai après la fin de période, canal, responsable. Écrite par grp_enregistrer_reporting et grp_arreter_reporting.';

create table if not exists public.grp_reportings_echeances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reporting_id uuid not null,
  entite_id uuid not null,
  periode_debut date not null,
  periode_fin date not null,
  echeance date not null,
  statut text not null default 'a_faire',
  fait_le date,
  fait_par uuid,
  note text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint grp_reportings_echeances_reporting_fkey foreign key (client_id, reporting_id) references public.grp_reportings(client_id, id) on delete cascade,
  constraint grp_reportings_echeances_une_fois unique (reporting_id, periode_debut),
  constraint grp_reportings_echeances_periode check (periode_debut <= periode_fin and periode_fin <= echeance),
  constraint grp_reportings_echeances_statut_check check (statut in ('a_faire', 'envoye', 'dispense')),
  constraint grp_reportings_echeances_fait check ((statut = 'a_faire') = (fait_le is null)),
  constraint grp_reportings_echeances_note_check check (char_length(note) <= 500)
);
comment on table public.grp_reportings_echeances is 'VARELO — l''échéance d''un reporting pour une période : à faire, envoyé (à telle date) ou dispensé. Créée par private.grp_generer_echeances, marquée par grp_marquer_reporting.';

create index if not exists grp_reportings_echeances_client_idx on public.grp_reportings_echeances (client_id, statut, echeance);

create or replace trigger grp_reportings_tracer after insert or update on public.grp_reportings
  for each row execute function private.tracer();
create or replace trigger grp_reportings_echeances_tracer after update on public.grp_reportings_echeances
  for each row execute function private.tracer();

alter table public.grp_reportings enable row level security;
alter table public.grp_reportings_echeances enable row level security;
revoke all on public.grp_reportings, public.grp_reportings_echeances from anon, authenticated;
grant select on public.grp_reportings, public.grp_reportings_echeances to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_reportings'
                 and policyname = 'membres lisent les reportings de leur perimetre') then
    create policy "membres lisent les reportings de leur perimetre" on public.grp_reportings
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_reportings_echeances'
                 and policyname = 'membres lisent les echeances de leur perimetre') then
    create policy "membres lisent les echeances de leur perimetre" on public.grp_reportings_echeances
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les échéances
-- ─────────────────────────────────────────────────────────────────────────

-- Le pas d'une périodicité, et le début de la période qui contient un jour.
create or replace function private.grp_periode_pas(p text)
 returns interval
 language sql
 immutable
 set search_path to ''
as $function$
  select case p when 'hebdomadaire' then interval '7 days' when 'trimestrielle' then interval '3 months'
                when 'annuelle' then interval '1 year' else interval '1 month' end
$function$;

create or replace function private.grp_periode_debut(p text, p_jour date)
 returns date
 language sql
 immutable
 set search_path to ''
as $function$
  select date_trunc(case p when 'hebdomadaire' then 'week' when 'trimestrielle' then 'quarter'
                           when 'annuelle' then 'year' else 'month' end, p_jour::timestamp)::date
$function$;

-- Crée d'avance les échéances dont la date tombe d'ici p_jusqua, depuis le début de chaque obligation active ;
-- recale les échéances à faire d'une obligation corrigée. Rend le nombre d'échéances créées.
create or replace function private.grp_generer_echeances(p_client uuid, p_jusqua date default null::date)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  d date;
  fin date;
  n integer := 0;
  k integer;
  v_jusqua date := coalesce(p_jusqua, current_date + 45);
begin
  perform set_config('omega.module', 'varelo', true);
  for r in select * from public.grp_reportings g where g.client_id = p_client and g.actif loop
    update public.grp_reportings_echeances e
       set echeance = e.periode_fin + r.delai_jours, maj_le = now()
     where e.reporting_id = r.id and e.statut = 'a_faire' and e.echeance <> e.periode_fin + r.delai_jours;
    d := private.grp_periode_debut(r.periodicite, r.debut);
    k := 0;
    loop
      fin := (d + private.grp_periode_pas(r.periodicite))::date - 1;
      exit when fin + r.delai_jours > v_jusqua or k >= 400;
      -- une période terminée avant le début du suivi n'est pas due
      if fin >= r.debut then
        insert into public.grp_reportings_echeances (client_id, reporting_id, entite_id, periode_debut, periode_fin, echeance)
        values (p_client, r.id, r.entite_id, d, fin, fin + r.delai_jours)
        on conflict (reporting_id, periode_debut) do nothing;
        if found then
          n := n + 1;
        end if;
      end if;
      d := (d + private.grp_periode_pas(r.periodicite))::date;
      k := k + 1;
    end loop;
  end loop;
  return n;
end $function$;

create or replace view public.grp_reportings_dus with (security_invoker = true) as
  select e.id, e.client_id, e.reporting_id, e.entite_id, en.nom as societe, r.destinataire, r.nature, r.objet_id, o.code_groupe,
         r.intitule, r.periodicite, r.delai_jours, r.canal, r.responsable_id, r.actif,
         e.periode_debut, e.periode_fin, e.echeance, (e.echeance - current_date) as jours_restants,
         e.statut, e.fait_le, e.fait_par, e.note,
         case
           when e.statut = 'dispense' then 'dispense'
           when e.statut = 'envoye' and e.fait_le > e.echeance then 'envoye_en_retard'
           when e.statut = 'envoye' then 'envoye'
           when e.echeance < current_date then 'en_retard'
           when e.echeance = current_date then 'aujourdhui'
           when e.echeance - current_date <= 7 then 'semaine'
           else 'a_venir'
         end as etat
  from public.grp_reportings_echeances e
  join public.grp_reportings r on r.client_id = e.client_id and r.id = e.reporting_id
  join public.entites en on en.client_id = e.client_id and en.id = e.entite_id
  left join public.grp_ref_objets o on o.client_id = r.client_id and o.id = r.objet_id;
comment on view public.grp_reportings_dus is 'VARELO — les reportings dus : chaque échéance avec sa société, son destinataire, son responsable et son état (en_retard, aujourdhui, semaine, a_venir, envoye, envoye_en_retard, dispense).';

revoke all on public.grp_reportings_dus from anon, authenticated;
grant select on public.grp_reportings_dus to authenticated;

-- Le contrôle : une alerte par échéance en retard, fermée à l'envoi ou à la dispense.
create or replace function private.grp_controler_reportings(p_client uuid)
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
  for r in select x.* from public.grp_reportings_dus x where x.client_id = p_client and x.etat = 'en_retard' and x.actif loop
    if not exists (select 1 from public.alertes a where a.client_id = p_client and a.acquittee_le is null
                   and a.cle_regroupement = 'varelo:reporting.' || r.id::text) then
      if private.lever_alerte_module(p_client, 'varelo', 'attention',
           left(format('Reporting en retard : %s pour %s (%s), dû le %s', r.intitule, r.destinataire, r.societe, to_char(r.echeance, 'DD/MM/YYYY')), 200),
           jsonb_build_object('echeance_id', r.id, 'reporting_id', r.reporting_id, 'societe', r.societe, 'destinataire', r.destinataire,
                              'intitule', r.intitule, 'echeance', r.echeance, 'periode_debut', r.periode_debut, 'periode_fin', r.periode_fin),
           'reporting.' || r.id::text, true, r.responsable_id) is not null then
        v_levees := v_levees + 1;
      end if;
    end if;
  end loop;
  for r in
    select a.cle_regroupement from public.alertes a
    where a.client_id = p_client and a.acquittee_le is null and a.cle_regroupement like 'varelo:reporting.%'
      and not exists (select 1 from public.grp_reportings_dus x where x.client_id = p_client and x.etat = 'en_retard' and x.actif
                      and 'varelo:reporting.' || x.id::text = a.cle_regroupement)
  loop
    v_closes := v_closes + private.fermer_alertes_releve(p_client, 'varelo', substr(r.cle_regroupement, char_length('varelo:') + 1),
                                                         'le reporting est envoyé, dispensé ou arrêté');
  end loop;
  return jsonb_build_object('alertes_levees', v_levees, 'alertes_closes', v_closes);
end $function$;

create or replace function private.grp_tache_reportings()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c uuid;
  n integer := 0;
begin
  for c in select distinct g.client_id from public.grp_reportings g where g.actif loop
    begin
      n := n + private.grp_generer_echeances(c);
      perform private.grp_controler_reportings(c);
    exception when others then
      raise warning 'varelo-reportings : client % : %', c, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les portes
-- ─────────────────────────────────────────────────────────────────────────

-- Créer (p_reporting nul) ou corriger une obligation. Champs : destinataire, objet_id, intitule, periodicite,
-- delai_jours, debut, canal, responsable_id, notes. Un champ absent garde sa valeur.
create or replace function private.grp_enregistrer_reporting(p_client uuid, p_entite uuid, p_champs jsonb, p_reporting uuid default null::uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant public.grp_reportings;
  v_objet public.grp_ref_objets;
  v_id uuid;
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_entite uuid := p_entite;
begin
  perform private.grp_exiger_installation(p_client);
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les champs d''un reporting se donnent en objet JSON.' using errcode = '22023';
  end if;
  if p_reporting is not null then
    select * into v_avant from public.grp_reportings g where g.id = p_reporting and g.client_id = p_client;
    if v_avant.id is null then
      raise exception 'Reporting introuvable.' using errcode = 'P0002';
    end if;
    if not v_avant.actif then
      raise exception 'Ce reporting est arrêté : il ne se corrige plus.' using errcode = '22023';
    end if;
    v_entite := coalesce(p_entite, v_avant.entite_id);
  end if;
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Un reporting s''enregistre par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, v_entite) or (v_avant.id is not null and not private.voit_entite(p_client, v_avant.entite_id)) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = v_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if f ? 'objet_id' and nullif(f ->> 'objet_id', '') is not null then
    begin
      select * into v_objet from public.grp_ref_objets o where o.id = (f ->> 'objet_id')::uuid and o.client_id = p_client;
    exception when invalid_text_representation then
      raise exception 'Identifiant d''objet illisible.' using errcode = '22023';
    end;
    if v_objet.id is null or v_objet.nature not in ('fournisseur', 'client') or v_objet.statut <> 'actif' then
      raise exception 'Le destinataire pris au référentiel est un fournisseur ou un client actif du groupe.' using errcode = '22023';
    end if;
  end if;
  if nullif(f ->> 'responsable_id', '') is not null and not exists (
       select 1 from public.comptes c where c.client_id = p_client and c.user_id::text = f ->> 'responsable_id') then
    raise exception 'Le responsable est une personne de l''organisation.' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  begin
    if p_reporting is null then
      insert into public.grp_reportings (client_id, entite_id, destinataire, nature, objet_id, intitule, periodicite, delai_jours, debut,
                                         canal, responsable_id, notes, cree_par)
      values (p_client, v_entite,
              btrim(coalesce(nullif(f ->> 'destinataire', ''), v_objet.nom_groupe, '')), v_objet.nature, v_objet.id,
              btrim(coalesce(f ->> 'intitule', '')),
              coalesce(nullif(f ->> 'periodicite', ''), 'mensuelle'),
              coalesce(nullif(f ->> 'delai_jours', '')::smallint, 10),
              coalesce(nullif(f ->> 'debut', '')::date, current_date),
              coalesce(nullif(f ->> 'canal', ''), 'courriel'),
              nullif(f ->> 'responsable_id', '')::uuid,
              nullif(btrim(f ->> 'notes'), ''),
              v_uid)
      returning id into v_id;
    else
      update public.grp_reportings g set
        entite_id = v_entite,
        destinataire = case when f ? 'destinataire' or f ? 'objet_id' then btrim(coalesce(nullif(f ->> 'destinataire', ''), v_objet.nom_groupe, '')) else g.destinataire end,
        nature = case when f ? 'objet_id' then v_objet.nature else g.nature end,
        objet_id = case when f ? 'objet_id' then v_objet.id else g.objet_id end,
        intitule = case when f ? 'intitule' then btrim(coalesce(f ->> 'intitule', '')) else g.intitule end,
        periodicite = case when f ? 'periodicite' then coalesce(nullif(f ->> 'periodicite', ''), 'mensuelle') else g.periodicite end,
        delai_jours = case when f ? 'delai_jours' then coalesce(nullif(f ->> 'delai_jours', '')::smallint, 10) else g.delai_jours end,
        canal = case when f ? 'canal' then coalesce(nullif(f ->> 'canal', ''), 'courriel') else g.canal end,
        responsable_id = case when f ? 'responsable_id' then nullif(f ->> 'responsable_id', '')::uuid else g.responsable_id end,
        notes = case when f ? 'notes' then nullif(btrim(f ->> 'notes'), '') else g.notes end,
        maj_le = now()
      where g.id = p_reporting
      returning g.id into v_id;
    end if;
  exception
    when check_violation then
      raise exception 'Reporting refusé : %', case
        when sqlerrm like '%destinataire%' then 'il faut un destinataire (une marque, une banque, un organisme).'
        when sqlerrm like '%intitule%' then 'l''intitulé fait 1 à 200 caractères.'
        when sqlerrm like '%periodicite%' then 'périodicité hebdomadaire, mensuelle, trimestrielle ou annuelle.'
        when sqlerrm like '%delai%' then 'un délai de 0 à 180 jours après la fin de la période.'
        when sqlerrm like '%canal%' then 'canal portail, courriel, extranet, courrier ou autre.'
        else sqlerrm end using errcode = '22023';
    when invalid_datetime_format or datetime_field_overflow or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Reporting refusé : une date ou un nombre est illisible (dates au format AAAA-MM-JJ).' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.reporting.enregistre', 'grp_reportings', v_id::text,
    jsonb_build_object('creation', p_reporting is null, 'champs', f - 'notes'), v_entite);
  perform private.grp_generer_echeances(p_client);
  perform private.grp_controler_reportings(p_client);
  return v_id;
end $function$;

-- Une échéance envoyée (à telle date) ou dispensée (le destinataire n'en veut pas cette fois-ci).
create or replace function private.grp_marquer_reporting(p_echeance uuid, p_statut text, p_date date default current_date, p_note text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  e public.grp_reportings_echeances;
  g public.grp_reportings;
  v_uid uuid := (select auth.uid());
begin
  select * into e from public.grp_reportings_echeances where id = p_echeance;
  if e.id is null or (v_uid is not null and e.client_id not in (select private.mes_clients())) then
    raise exception 'Échéance introuvable.' using errcode = 'P0002';
  end if;
  select * into g from public.grp_reportings where id = e.reporting_id;
  if v_uid is not null and not (
       v_uid = g.responsable_id
       or (private.a_un_role(e.client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(e.client_id, e.entite_id))) then
    raise exception 'Un reporting se marque par son responsable, le gérant, l''administrateur ou un valideur de la société.' using errcode = '42501';
  end if;
  if p_statut is null or p_statut not in ('envoye', 'dispense') then
    raise exception 'Une échéance passe « envoye » ou « dispense » (%).', coalesce(p_statut, 'vide') using errcode = '22023';
  end if;
  if e.statut <> 'a_faire' then
    raise exception 'Cette échéance est déjà « % ».', e.statut using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date then
    raise exception 'La date est celle de l''envoi : aujourd''hui ou avant.' using errcode = '22023';
  end if;
  if p_statut = 'dispense' and char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'Une dispense dit pourquoi.' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_reportings_echeances set statut = p_statut, fait_le = p_date, fait_par = v_uid,
         note = left(nullif(btrim(p_note), ''), 500), maj_le = now()
  where id = e.id;
  perform private.grp_journal(e.client_id, 'varelo.reporting.' || p_statut, 'grp_reportings_echeances', e.id::text,
    jsonb_build_object('intitule', g.intitule, 'destinataire', g.destinataire, 'periode_debut', e.periode_debut, 'periode_fin', e.periode_fin,
                       'echeance', e.echeance, 'date', p_date, 'en_retard', p_date > e.echeance, 'note', left(nullif(btrim(p_note), ''), 500)), e.entite_id);
  perform private.grp_controler_reportings(e.client_id);
  return jsonb_build_object('echeance', e.id, 'statut', p_statut, 'date', p_date, 'en_retard', p_date > e.echeance);
end $function$;

create or replace function private.grp_arreter_reporting(p_reporting uuid, p_motif text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.grp_reportings;
  v_uid uuid := (select auth.uid());
begin
  select * into g from public.grp_reportings where id = p_reporting;
  if g.id is null or (v_uid is not null and g.client_id not in (select private.mes_clients())) then
    raise exception 'Reporting introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null and not private.a_un_role(g.client_id, array['gerant', 'admin']) then
    raise exception 'Un reporting s''arrête par le gérant ou l''administrateur.' using errcode = '42501';
  end if;
  if not g.actif then
    return;
  end if;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_reportings set actif = false, maj_le = now() where id = g.id;
  perform private.grp_journal(g.client_id, 'varelo.reporting.arrete', 'grp_reportings', g.id::text,
    jsonb_build_object('intitule', g.intitule, 'destinataire', g.destinataire, 'motif', left(nullif(btrim(p_motif), ''), 500)), g.entite_id);
  perform private.grp_controler_reportings(g.client_id);
end $function$;

create or replace function public.grp_enregistrer_reporting(p_client uuid, p_entite uuid, p_champs jsonb, p_reporting uuid default null::uuid)
 returns uuid language sql set search_path to ''
as $function$ select private.grp_enregistrer_reporting(p_client, p_entite, p_champs, p_reporting) $function$;

create or replace function public.grp_marquer_reporting(p_echeance uuid, p_statut text, p_date date default current_date, p_note text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_marquer_reporting(p_echeance, p_statut, p_date, p_note) $function$;

create or replace function public.grp_arreter_reporting(p_reporting uuid, p_motif text default null::text)
 returns void language sql set search_path to ''
as $function$ select private.grp_arreter_reporting(p_reporting, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le point du matin : « Reportings dus » (remplace grp_ce_matin et grp_deposer_points de b1_08)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_lignes_reportings(p_client uuid, p_responsable uuid default null::uuid)
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
  for r in
    select x.* from public.grp_reportings_dus x
    where x.client_id = p_client and x.actif and x.etat in ('en_retard', 'aujourdhui', 'semaine')
      and (p_responsable is null or x.responsable_id = p_responsable)
    order by x.echeance, x.societe
  loop
    exit when n >= 15;
    v := v || jsonb_build_object(
      'texte', left(case r.etat
        when 'en_retard' then format('En retard depuis le %s : %s pour %s (%s, période du %s au %s)', to_char(r.echeance, 'DD/MM'), r.intitule,
                                     r.destinataire, r.societe, to_char(r.periode_debut, 'DD/MM'), to_char(r.periode_fin, 'DD/MM'))
        when 'aujourdhui' then format('Aujourd''hui : %s pour %s (%s)', r.intitule, r.destinataire, r.societe)
        else format('Avant le %s : %s pour %s (%s)', to_char(r.echeance, 'DD/MM'), r.intitule, r.destinataire, r.societe) end, 300),
      'gravite', case r.etat when 'en_retard' then 'critique' when 'aujourdhui' then 'attention' else 'info' end,
      'lien', '/espace/varelo', 'objet_type', 'grp_reportings_echeances', 'objet_id', r.id::text);
    n := n + 1;
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
                            'reportings', private.grp_lignes_reportings(p_client),
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
  u record;
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
        select * from (values ('groupe', 'Le groupe ce matin', 5), ('reportings', 'Reportings dus', 8), ('contrats', 'Contrats à dénoncer', 10),
                              ('encours', 'Encours du groupe', 20), ('reciproques', 'Réciproques intragroupe', 30)) as t(quoi, titre, ordre)
      loop
        v_items := case s.quoi when 'groupe' then private.grp_lignes_groupe(k.client_id)
                               when 'reportings' then private.grp_lignes_reportings(k.client_id)
                               else private.grp_lignes_matin(k.client_id, s.quoi) end;
        for q in
          select null::uuid as equipe_id, 'gerant'::text as role
          union all
          select e.id, null from public.equipes e
          where e.client_id = k.client_id
            and (e.cle = 'direction_financiere' or (e.cle = 'direction_juridique' and s.quoi = 'contrats')
                 or (e.cle = 'presidence' and s.quoi = 'groupe') or (e.cle = 'direction_operations' and s.quoi = 'reportings'))
        loop
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, null, q.equipe_id);
          else
            perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, v_items, null, q.equipe_id,
                                            false, now(), false, s.ordre);
          end if;
        end loop;
      end loop;
      -- chaque responsable nommé reçoit ses propres reportings
      for u in
        select distinct g.responsable_id from public.grp_reportings g
        where g.client_id = k.client_id and g.actif and g.responsable_id is not null
      loop
        v_items := private.grp_lignes_reportings(k.client_id, u.responsable_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', null, null);
        else
          perform private.deposer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', v_items, null, null,
                                          false, now(), false, 7);
        end if;
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
-- 5. Droits d'exécution et passage de nuit
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_periode_pas(text) from public, anon, authenticated;
revoke execute on function private.grp_periode_debut(text, date) from public, anon, authenticated;
revoke execute on function private.grp_generer_echeances(uuid, date) from public, anon, authenticated;
revoke execute on function private.grp_controler_reportings(uuid) from public, anon, authenticated;
revoke execute on function private.grp_tache_reportings() from public, anon, authenticated;
grant execute on function private.grp_periode_pas(text) to service_role;
grant execute on function private.grp_periode_debut(text, date) to service_role;
grant execute on function private.grp_generer_echeances(uuid, date) to service_role;
grant execute on function private.grp_controler_reportings(uuid) to service_role;
grant execute on function private.grp_tache_reportings() to service_role;

revoke execute on function private.grp_enregistrer_reporting(uuid, uuid, jsonb, uuid) from public, anon;
revoke execute on function private.grp_marquer_reporting(uuid, text, date, text) from public, anon;
revoke execute on function private.grp_arreter_reporting(uuid, text) from public, anon;
revoke execute on function private.grp_lignes_reportings(uuid, uuid) from public, anon;
grant execute on function private.grp_enregistrer_reporting(uuid, uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function private.grp_marquer_reporting(uuid, text, date, text) to authenticated, service_role;
grant execute on function private.grp_arreter_reporting(uuid, text) to authenticated, service_role;
grant execute on function private.grp_lignes_reportings(uuid, uuid) to authenticated, service_role;

revoke execute on function public.grp_enregistrer_reporting(uuid, uuid, jsonb, uuid) from public, anon;
revoke execute on function public.grp_marquer_reporting(uuid, text, date, text) from public, anon;
revoke execute on function public.grp_arreter_reporting(uuid, text) from public, anon;
grant execute on function public.grp_enregistrer_reporting(uuid, uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function public.grp_marquer_reporting(uuid, text, date, text) to authenticated, service_role;
grant execute on function public.grp_arreter_reporting(uuid, text) to authenticated, service_role;
revoke execute on function private.grp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.grp_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('varelo-reportings', '23 4 * * *', $cron$select private.grp_tache_reportings()$cron$);
