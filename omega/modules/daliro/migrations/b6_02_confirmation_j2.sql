-- b6_02 — DALIRO : la confirmation des passages à J-2 et les remplaçants (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE. La page /secteurs/btp promet « vos sous-traitants
-- confirment leur passage à J-2 ; si l'un d'eux ne répond pas, des remplaçants
-- vous sont proposés ». Le socle porte l'état (btp_passages.confirmation :
-- non_demandee → demandee → confirmee | declinee | sans_reponse) et RIEN ne le
-- fait avancer : aucune porte ne demande, aucune ne reçoit la réponse, aucune
-- ne propose de remplaçant, aucun cron.
--
-- CE QUI EST POSÉ.
--   · public.btp_confirmations : chaque événement de confirmation (demandée,
--     confirmée, déclinée, sans réponse) avec sa clé — une réponse rejouée
--     avec la même clé ne réécrit rien.
--   · private.btp_demander_confirmations(p_client, p_jour) : les passages de
--     sous-traitants qui commencent dans deux jours OUVRÉS (ajouter_jours du
--     socle, territoire du chantier) passent « demandee » et l'événement
--     daliro.confirmation_demandee est publié (l'expéditeur du socle le porte
--     au tiers par son canal) ; ceux qui commencent demain sans réponse
--     passent « sans_reponse », une alerte est levée pour le conducteur avec
--     les remplaçants possibles.
--   · private.btp_repondre_confirmation(p_passage, p_reponse, p_cle, p_detail)
--     : la réponse du tiers (par la réception du socle, ou le bureau qui la
--     note après un appel) ; idempotente sur la clé.
--   · private.btp_proposer_remplacants(p_passage) : les tiers sous-traitants
--     du même corps d'état, du même département, joignables, à jour de
--     vigilance, qui n'ont pas décliné ce passage.
--   · private.btp_tache_confirmations() + cron daliro-confirmations-j2 à 17 h
--     Paris (15 h UTC).
--   · journal : private.journaliser seulement.
--
-- Règles de pose : create or replace / if not exists / where not exists ;
-- jamais de DROP ni de DELETE.

create table if not exists public.btp_confirmations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  passage_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  tiers_id uuid,
  evenement text not null,
  canal text,
  cle text not null,
  detail jsonb not null default '{}'::jsonb,
  version_passage integer,
  survenu_le timestamptz not null default now(),
  constraint btp_confirmations_client_id_id_key unique (client_id, id),
  constraint btp_confirmations_une_cle unique (client_id, cle),
  constraint btp_confirmations_passage_fkey foreign key (client_id, passage_id) references public.btp_passages(client_id, id) on delete cascade,
  constraint btp_confirmations_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_confirmations_tiers_fkey foreign key (client_id, tiers_id) references public.btp_tiers(client_id, id) on delete set null (tiers_id),
  constraint btp_confirmations_evenement_check check (evenement in ('demandee', 'confirmee', 'declinee', 'sans_reponse')),
  constraint btp_confirmations_canal_check check (canal is null or canal in ('whatsapp', 'sms', 'email', 'telephone')),
  constraint btp_confirmations_cle_check check (char_length(cle) between 1 and 200)
);
comment on table public.btp_confirmations is 'DALIRO — le fil des confirmations d''un passage (demandée à J-2, confirmée, déclinée, sans réponse), idempotent sur (client, clé).';
create index if not exists btp_confirmations_passage_idx on public.btp_confirmations (passage_id, survenu_le);

alter table public.btp_confirmations enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_confirmations' and policyname = 'membres lisent les confirmations de leurs chantiers') then
    create policy "membres lisent les confirmations de leurs chantiers" on public.btp_confirmations
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_confirmations from anon, authenticated;
grant select on table public.btp_confirmations to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Les remplaçants possibles d'un passage de sous-traitant
-- ─────────────────────────────────────────────────────────────────────────
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
    order by (v_corps is not null and v_corps = any (t.corps_etat)) desc,
             (v_departement = any (t.departements)) desc nulls last,
             case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
               when 'a_jour' then 0 when 'a_renouveler' then 1 else 2 end,
             t.nom collate "C";
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Demander les confirmations (J-2 ouvrés) et relever les sans-réponse (J-1)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_demander_confirmations(p_client uuid, p_jour date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_jour date := coalesce(p_jour, current_date);
  v_canal text;
  v_demandees integer := 0;
  v_sans_reponse integer := 0;
  v_remplacants jsonb;
  v_chantiers uuid[] := '{}';
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
  end if;

  -- 1. J-2 : les passages de sous-traitants qui commencent dans deux jours ouvrés, pas encore demandés.
  for r in
    select p.*, c.nom as chantier_nom, c.territoire, c.conducteur_id, t.nom as tiers_nom, t.telephone, t.email, t.canal as tiers_canal
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'non_demandee'
      and c.statut = 'ouvert' and t.actif and t.confirmer_passages
      and (t.telephone is not null or t.email is not null)
      and p.debut > v_jour
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
    order by p.debut, p.id
  loop
    v_canal := coalesce(r.tiers_canal, case when r.telephone is not null then 'whatsapp' else 'email' end);
    update public.btp_passages set confirmation = 'demandee' where id = r.id;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'demandee', v_canal,
            'demande:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('debut', r.debut, 'fin', r.fin, 'tache', r.tache), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.publier_evenement(r.client_id, 'daliro.confirmation_demandee',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'chantier_nom', r.chantier_nom, 'tiers', r.tiers_id,
                         'tiers_nom', r.tiers_nom, 'canal', v_canal, 'telephone', r.telephone, 'email', r.email,
                         'debut', r.debut, 'fin', r.fin, 'tache', r.tache, 'version', r.version),
      'confirmation:' || r.id::text || ':v' || r.version);
    v_demandees := v_demandees + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  -- 2. J-1 : demandé, toujours sans réponse la veille → sans_reponse, alerte au conducteur avec les remplaçants.
  for r in
    select p.*, c.nom as chantier_nom, c.conducteur_id, t.nom as tiers_nom
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    left join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'demandee'
      and p.debut <= v_jour + 1
    order by p.debut, p.id
  loop
    update public.btp_passages set confirmation = 'sans_reponse' where id = r.id;
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(r.id) limit 5) x;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'sans_reponse',
            'sans_reponse:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('remplacants', v_remplacants), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('%s n''a pas confirmé son passage du %s sur %s', coalesce(r.tiers_nom, 'Un sous-traitant'),
                  to_char(r.debut, 'DD/MM'), r.chantier_nom), 150),
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut,
                         'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text, true, r.conducteur_id);
    perform private.publier_evenement(r.client_id, 'daliro.passage_sans_reponse',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut, 'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text || ':v' || r.version);
    v_sans_reponse := v_sans_reponse + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  for r in select c.id, c.entite_id from public.btp_chantiers c where c.id = any (v_chantiers) loop
    perform private.journaliser(p_client, 'daliro.confirmations_relevees', 'btp_chantiers', r.id::text,
      jsonb_build_object('jour', v_jour, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse), r.entite_id);
  end loop;
  return jsonb_build_object('jour', v_jour, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La réponse du tiers (réception du socle, ou le bureau après un appel)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_repondre_confirmation(p_passage uuid, p_reponse text, p_cle text, p_detail jsonb default '{}'::jsonb)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  c public.btp_chantiers;
  v_tiers text;
  v_remplacants jsonb;
begin
  if p_reponse not in ('confirmee', 'declinee') then
    raise exception 'Une réponse est « confirmee » ou « declinee ».' using errcode = '22023';
  end if;
  if coalesce(btrim(p_cle), '') = '' then
    raise exception 'Une réponse porte sa clé (l''identifiant du message reçu).' using errcode = '22023';
  end if;
  select * into p from public.btp_passages where id = p_passage for update;
  if not found then
    return false;
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  if exists (select 1 from public.btp_confirmations x where x.client_id = p.client_id and x.cle = btrim(p_cle)) then
    return true;
  end if;
  if p.confirmation = 'non_demandee' then
    raise exception 'Aucune confirmation n''a été demandée pour ce passage.' using errcode = '23514';
  end if;
  if p.statut <> 'prevu' then
    raise exception 'Ce passage n''est plus prévu (%).', p.statut using errcode = '23514';
  end if;
  select * into c from public.btp_chantiers where id = p.chantier_id;
  select t.nom into v_tiers from public.btp_tiers t where t.id = p.tiers_id;
  update public.btp_passages set confirmation = p_reponse where id = p.id;
  insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
  values (p.client_id, p.id, p.chantier_id, p.entite_id, p.tiers_id, p_reponse, nullif(p_detail ->> 'canal', ''), btrim(p_cle),
          coalesce(p_detail, '{}'::jsonb), p.version);
  if p_reponse = 'declinee' then
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(p.id) limit 5) x;
    perform private.lever_alerte_module(p.client_id, 'daliro_referentiel', 'attention',
      left(format('%s a décliné son passage du %s sur %s', coalesce(v_tiers, 'Un sous-traitant'), to_char(p.debut, 'DD/MM'), c.nom), 150),
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'tiers', p.tiers_id, 'debut', p.debut, 'remplacants', v_remplacants),
      'decline:' || p.id::text, true, c.conducteur_id);
    perform private.publier_evenement(p.client_id, 'daliro.passage_decline',
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'tiers', p.tiers_id, 'debut', p.debut, 'remplacants', v_remplacants),
      'decline:' || p.id::text || ':v' || p.version);
  end if;
  perform private.journaliser(p.client_id, case p_reponse when 'confirmee' then 'daliro.passage_confirme' else 'daliro.passage_decline' end,
    'btp_passages', p.id::text, jsonb_build_object('tiers', p.tiers_id, 'debut', p.debut, 'cle', btrim(p_cle)), p.entite_id);
  return true;
end $function$;

-- Le passage quotidien (cron) : chaque organisation installée.
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
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

-- Façades publiques.
create or replace function public.btp_demander_confirmations(p_client uuid, p_jour date default current_date)
 returns jsonb language sql set search_path to ''
as $function$ select private.btp_demander_confirmations(p_client, p_jour) $function$;

create or replace function public.btp_repondre_confirmation(p_passage uuid, p_reponse text, p_cle text, p_detail jsonb default '{}'::jsonb)
 returns boolean language sql set search_path to ''
as $function$ select private.btp_repondre_confirmation(p_passage, p_reponse, p_cle, p_detail) $function$;

create or replace function public.btp_proposer_remplacants(p_passage uuid)
 returns table(tiers_id uuid, nom text, telephone text, email text, canal text, vigilance text, corps_commun boolean, departement_ok boolean)
 language sql stable set search_path to ''
as $function$ select * from private.btp_proposer_remplacants(p_passage) $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_proposer_remplacants(uuid) from public, anon;
revoke execute on function private.btp_demander_confirmations(uuid, date) from public, anon;
revoke execute on function private.btp_repondre_confirmation(uuid, text, text, jsonb) from public, anon;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_proposer_remplacants(uuid) to authenticated, service_role;
grant execute on function private.btp_demander_confirmations(uuid, date) to authenticated, service_role;
grant execute on function private.btp_repondre_confirmation(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function private.btp_tache_confirmations() to service_role;
revoke execute on function public.btp_demander_confirmations(uuid, date) from public, anon;
revoke execute on function public.btp_repondre_confirmation(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.btp_proposer_remplacants(uuid) from public, anon;
grant execute on function public.btp_demander_confirmations(uuid, date) to authenticated, service_role;
grant execute on function public.btp_repondre_confirmation(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.btp_proposer_remplacants(uuid) to authenticated, service_role;

insert into private.tables_locataires (nom, note)
select 'btp_confirmations', 'DALIRO — confirmations J-2 (B6)'
where not exists (select 1 from private.tables_locataires t where t.nom = 'btp_confirmations');

-- Le cron : 17 h Paris (15 h UTC l'été, 16 h l'hiver — le socle planifie en UTC).
select cron.schedule('daliro-confirmations-j2', '0 15 * * *', $cron$select private.btp_tache_confirmations()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-confirmations-j2');
