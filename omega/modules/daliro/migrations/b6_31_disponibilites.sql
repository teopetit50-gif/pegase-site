-- b6_31 — DALIRO : les disponibilités de l'annuaire (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « L'annuaire réunit vos intervenants, leurs lots et leurs disponibilités. »
-- et « Quand un intervenant ne répond pas, Daliro propose des remplaçants tirés de votre annuaire. » Jusqu'ici, un
-- remplaçant pouvait être déjà pris ailleurs le même jour ; aucune absence ne se notait.
--
-- CE QUI EST POSÉ.
--   · public.btp_indisponibilites : les absences d'un tiers (du, au, motif), notées par le bureau ; une absence ne
--     s'efface pas, elle s'annule (annulee, annulee_le). Lecture par les membres (RLS), écriture par les portes.
--   · public.btp_noter_indisponibilite(tiers, du, au, motif) et public.btp_annuler_indisponibilite(id) : gérant,
--     admin ou valideur (comme le planning). Au plus 366 jours ; « au » ne précède pas « du ».
--   · public.btp_disponibilites(client, du, au) : pour chaque sous-traitant actif, ses passages prévus et ses
--     absences qui recoupent la période (l'écran de l'annuaire, les 30 prochains jours).
--   · private.btp_proposer_remplacants (b6_02) : en plus des règles d'avant, le remplaçant est DISPONIBLE sur les
--     dates du passage : aucun autre passage prévu qui les recoupe, aucune absence notée. L'alerte du soir (b6_29),
--     le refus (b6_02) et la porte publique (b6_27) en profitent sans changer.
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.

create table if not exists public.btp_indisponibilites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tiers_id uuid not null,
  du date not null,
  au date not null,
  motif text,
  annulee boolean not null default false,
  annulee_le timestamptz,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint btp_indisponibilites_tiers_fkey foreign key (client_id, tiers_id) references public.btp_tiers(client_id, id) on delete cascade,
  constraint btp_indisponibilites_periode_check check (au >= du and au - du <= 366),
  constraint btp_indisponibilites_motif_check check (char_length(motif) <= 200)
);
comment on table public.btp_indisponibilites is 'DALIRO — absences des tiers (congés, autre chantier hors Daliro). Écrite par les portes seules ; annulée, jamais effacée.';
create index if not exists btp_indisponibilites_tiers_idx on public.btp_indisponibilites (tiers_id, du, au) where not annulee;
alter table public.btp_indisponibilites enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_indisponibilites' and policyname = 'membres lisent les absences de leur annuaire') then
    create policy "membres lisent les absences de leur annuaire" on public.btp_indisponibilites
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $do$;
revoke all on table public.btp_indisponibilites from anon, authenticated;
grant select on table public.btp_indisponibilites to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_indisponibilites']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

create or replace function private.btp_exiger_annuaire(p_client uuid)
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
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
    raise exception 'L''annuaire de cette organisation ne vous est pas ouvert.' using errcode = '42501';
  end if;
end $function$;

create or replace function public.btp_noter_indisponibilite(p_tiers uuid, p_du date, p_au date, p_motif text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.btp_tiers;
  v_id uuid;
begin
  select * into t from public.btp_tiers where id = p_tiers;
  if not found then
    raise exception 'Tiers introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_annuaire(t.client_id);
  if p_du is null or p_au is null or p_au < p_du then
    raise exception 'Une absence a un premier et un dernier jour, dans cet ordre.' using errcode = '22023';
  end if;
  if p_au - p_du > 366 then
    raise exception 'Une absence dure au plus un an.' using errcode = '22023';
  end if;
  insert into public.btp_indisponibilites (client_id, tiers_id, du, au, motif, cree_par)
  values (t.client_id, t.id, p_du, p_au, left(nullif(btrim(p_motif), ''), 200), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser(t.client_id, 'daliro.absence_notee', 'btp_tiers', t.id::text,
    jsonb_build_object('absence', v_id, 'du', p_du, 'au', p_au, 'motif', left(nullif(btrim(p_motif), ''), 200)), null);
  return v_id;
end $function$;

create or replace function public.btp_annuler_indisponibilite(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  i public.btp_indisponibilites;
begin
  select * into i from public.btp_indisponibilites where id = p_id for update;
  if not found then
    raise exception 'Absence introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_annuaire(i.client_id);
  if i.annulee then
    return;
  end if;
  update public.btp_indisponibilites set annulee = true, annulee_le = now() where id = i.id;
  perform private.journaliser(i.client_id, 'daliro.absence_annulee', 'btp_tiers', i.tiers_id::text,
    jsonb_build_object('absence', i.id, 'du', i.du, 'au', i.au), null);
end $function$;

create or replace function public.btp_disponibilites(p_client uuid, p_du date default null, p_au date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_du date := coalesce(p_du, (now() at time zone 'Europe/Paris')::date);
  v_au date := coalesce(p_au, coalesce(p_du, (now() at time zone 'Europe/Paris')::date) + 30);
begin
  perform private.btp_exiger_annuaire(p_client);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'tiers', t.id, 'nom', t.nom,
             'absences', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'du', i.du, 'au', i.au, 'motif', i.motif) order by i.du)
                                   from public.btp_indisponibilites i
                                   where i.tiers_id = t.id and not i.annulee and i.du <= v_au and i.au >= v_du), '[]'::jsonb),
             'passages', coalesce((select jsonb_agg(jsonb_build_object('passage', p.id, 'chantier', c.nom, 'tache', p.tache, 'debut', p.debut, 'fin', p.fin) order by p.debut)
                                   from public.btp_passages p join public.btp_chantiers c on c.id = p.chantier_id
                                   where p.tiers_id = t.id and p.statut = 'prevu' and p.debut <= v_au and p.fin >= v_du), '[]'::jsonb))
           order by t.nom)
    from public.btp_tiers t
    where t.client_id = p_client and t.actif and 'sous_traitant' = any (t.roles)), '[]'::jsonb);
end $function$;

create or replace function private.btp_proposer_remplacants(p_passage uuid)
 returns table(tiers_id uuid, nom text, telephone text, email text, canal text, vigilance text,
               corps_commun boolean, departement_ok boolean)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  v_corps text;
  v_departement text;
begin
  select * into p from public.btp_passages where id = p_passage;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  select l.corps_etat into v_corps from public.btp_lots l where l.chantier_id = p.chantier_id and l.id = p.lot_id;
  select c.departement into v_departement from public.btp_chantiers c where c.id = p.chantier_id;
  return query
    select t.id, t.nom, t.telephone, t.email,
           coalesce(t.canal, case when t.telephone is not null then 'whatsapp' else 'email' end),
           public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le),
           (v_corps is not null and v_corps = any (t.corps_etat)),
           (cardinality(t.departements) = 0 or v_departement = any (t.departements))
    from public.btp_tiers t
    where t.client_id = p.client_id and t.actif and t.confirmer_passages
      and 'sous_traitant' = any (t.roles)
      and t.id is distinct from p.tiers_id
      and (t.telephone is not null or t.email is not null)
      and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) not in ('absente', 'echue')
      and (v_corps is null or v_corps = any (t.corps_etat))
      and (cardinality(t.departements) = 0 or v_departement is null or v_departement = any (t.departements))
      and not exists (select 1 from public.btp_confirmations x
                      where x.passage_id = p.id and x.tiers_id = t.id and x.evenement = 'declinee')
      -- b6_31 : disponible sur les dates du passage — ni un autre passage prévu qui les recoupe, ni une absence notée.
      and not exists (select 1 from public.btp_passages o
                      where o.client_id = p.client_id and o.tiers_id = t.id and o.id <> p.id and o.statut = 'prevu'
                        and o.debut <= p.fin and o.fin >= p.debut)
      and not exists (select 1 from public.btp_indisponibilites i
                      where i.client_id = p.client_id and i.tiers_id = t.id and not i.annulee
                        and i.du <= p.fin and i.au >= p.debut)
    order by (v_corps is not null and v_corps = any (t.corps_etat)) desc,
             (v_departement = any (t.departements)) desc nulls last,
             case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
               when 'a_jour' then 0 when 'a_renouveler' then 1 else 2 end,
             t.nom collate "C";
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_exiger_annuaire(uuid) from public, anon, authenticated;
grant execute on function private.btp_exiger_annuaire(uuid) to service_role;
revoke execute on function public.btp_noter_indisponibilite(uuid, date, date, text) from public, anon;
grant execute on function public.btp_noter_indisponibilite(uuid, date, date, text) to authenticated, service_role;
revoke execute on function public.btp_annuler_indisponibilite(uuid) from public, anon;
grant execute on function public.btp_annuler_indisponibilite(uuid) to authenticated, service_role;
revoke execute on function public.btp_disponibilites(uuid, date, date) from public, anon;
grant execute on function public.btp_disponibilites(uuid, date, date) to authenticated, service_role;
revoke execute on function private.btp_proposer_remplacants(uuid) from public, anon;
grant execute on function private.btp_proposer_remplacants(uuid) to authenticated, service_role;
