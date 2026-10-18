-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_11 : la relance envoyée à la main (18/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Quand l'envoi du module est coupé (reglages_envois.mode = 'coupe', ainsi pour Omega sur la recette) ou qu'on préfère
-- envoyer soi-même, la relance validée part par la messagerie de l'organisation, par courrier ou au téléphone. On le
-- note ici : cashd_envois_main (une ligne par relance), porte cashd_noter_envoi_main (gestion seulement, jamais avant
-- la validation, jamais pour une relance déjà partie par le moteur ou coupée). La relance compte alors comme partie :
-- dans la liste du jour (cashd_relances_du_jour), le dossier (cashd_dossier) et le taux de réponse (cashd_reponses).
-- Aucun mode d'envoi n'est changé ici.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de DROP ni de DELETE ; RLS, revoke puis grants ;
-- revoke execute de public sur les fonctions.

create table if not exists public.cashd_envois_main (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  relance_id uuid not null references public.cashd_relances(id) on delete cascade,
  canal text not null,
  envoye_le timestamptz not null,
  note text,
  note_par uuid,
  cree_le timestamptz not null default now(),
  constraint cashd_envois_main_un unique (relance_id),
  constraint cashd_envois_main_check check (canal in ('email', 'courrier', 'telephone', 'autre') and char_length(note) <= 500)
);
create index if not exists cashd_envois_main_client_idx on public.cashd_envois_main (client_id, envoye_le desc);
alter table public.cashd_envois_main enable row level security;
do $do$ begin
  -- Lisible par qui lit la relance (le portefeuille du chargé, c2_08, s'applique donc aussi).
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_envois_main' and policyname = 'qui lit la relance lit son envoi') then
    create policy "qui lit la relance lit son envoi" on public.cashd_envois_main for select to authenticated
      using (client_id in (select private.mes_clients()) and exists (select 1 from public.cashd_relances r where r.id = cashd_envois_main.relance_id));
  end if;
end $do$;
revoke all on table public.cashd_envois_main from anon, authenticated;
grant select on table public.cashd_envois_main to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'cashd_envois_main'
               where not exists (select 1 from private.tables_locataires t where t.nom = 'cashd_envois_main')$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- Noter qu'une relance validée est partie à la main. Gestion seulement ; daté au journal.
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
  if r.statut <> 'a_valider' then
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
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_envoyee_main', 'cashd_relances', r.id::text,
    jsonb_build_object('canal', p_canal, 'envoye_le', v_le, 'destinataire', r.destinataire_adresse, 'palier', r.palier, 'montant', r.montant), r.entite_id);
  return to_jsonb(x);
end $function$;

-- Les relances du jour (c2_02) : une relance envoyée à la main est « partie », à sa date.
create or replace function public.cashd_relances_du_jour(p_client uuid, p_jour date default null)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'etat', case when m.id is not null then 'envoyee' else r.etat end,
      'envoye_le', coalesce(r.envoye_le, m.envoye_le),
      'envoi_main', case when m.id is not null then jsonb_build_object('canal', m.canal, 'envoye_le', m.envoye_le, 'note', m.note) end,
      'compte', (select c.nom from public.cashd_comptes c where c.id = r.compte_id),
      'pieces', (select coalesce(jsonb_agg(jsonb_build_object('facture_id', p.facture_id, 'numero', f.numero, 'palier', p.palier, 'reste_du', p.reste_du,
                                                              'retard_jours', p.retard_jours, 'penalites', p.penalites, 'indemnite', p.indemnite) order by f.echeance), '[]'::jsonb)
                 from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id where p.relance_id = r.id and not p.annulee))
      order by case when m.id is not null then 4 else case r.etat when 'a_valider' then 0 when 'non_reglee' then 1 when 'bloquee' then 2 when 'sans_adresse' then 3 else 4 end end,
               r.montant desc), '[]'::jsonb)
  from public.cashd_relances_etat r
  left join public.cashd_envois_main m on m.relance_id = r.id
  where r.client_id = p_client and (p_jour is null or r.jour = p_jour)
    and (p_jour is not null or r.jour >= (now() at time zone 'Europe/Paris')::date - 30)
$function$;

-- Le taux de réponse (c2_03) : une relance envoyée à la main compte comme partie, à sa date.
create or replace view public.cashd_reponses with (security_invoker = true) as
select r.client_id, r.palier,
       count(*) filter (where e.envoye_le is not null)::integer as envoyees,
       count(*) filter (where e.envoye_le is not null and (
         r.reponse_le is not null
         or exists (select 1 from public.cashd_relances_pieces p join public.cashd_imputations x on x.facture_id = p.facture_id and x.annulee_le is null
                    left join public.cashd_reglements g on g.id = x.reglement_id
                    where p.relance_id = r.id and coalesce(g.recu_le, (x.cree_le at time zone 'Europe/Paris')::date)
                          between (e.envoye_le at time zone 'Europe/Paris')::date and (e.envoye_le at time zone 'Europe/Paris')::date + 15)))::integer as suivies,
       round(100.0 * count(*) filter (where e.envoye_le is not null and (
         r.reponse_le is not null
         or exists (select 1 from public.cashd_relances_pieces p join public.cashd_imputations x on x.facture_id = p.facture_id and x.annulee_le is null
                    left join public.cashd_reglements g on g.id = x.reglement_id
                    where p.relance_id = r.id and coalesce(g.recu_le, (x.cree_le at time zone 'Europe/Paris')::date)
                          between (e.envoye_le at time zone 'Europe/Paris')::date and (e.envoye_le at time zone 'Europe/Paris')::date + 15)))
             / nullif(count(*) filter (where e.envoye_le is not null), 0), 1) as taux_pct
from public.cashd_relances r
left join lateral (
  select coalesce((select v.envoye_le from public.envois v where v.id = r.envoi_id),
                  (select m.envoye_le from public.cashd_envois_main m where m.relance_id = r.id)) as envoye_le) e on true
group by r.client_id, r.palier;

revoke all on table public.cashd_reponses from anon, authenticated;
grant select on table public.cashd_reponses to authenticated;

-- Le dossier (c2_05) : une relance envoyée à la main y figure comme partie, avec son canal.
create or replace function public.cashd_dossier(p_compte uuid, p_facture uuid default null, p_motif text default 'litige')
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'motif', coalesce(p_motif, 'litige'),
    'constitue_le', now(),
    'creancier', (select jsonb_build_object('nom', e.nom, 'siren', e.siren) from public.entites e where e.id = c.entite_id),
    'debiteur', jsonb_build_object('nom', c.nom, 'reference', c.reference, 'siren', c.siren, 'groupe', c.groupe, 'pays', c.pays,
                                   'contact_facturation', c.contact_facturation_nom, 'adresse_facturation', c.contact_facturation_email,
                                   'statut', c.statut, 'statut_motif', c.statut_motif),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'delais', (select to_jsonb(d) from public.cashd_delais_reglement d where d.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || jsonb_build_object(
                  'echeancier', (select coalesce(jsonb_agg(jsonb_build_object('rang', x.rang, 'echeance', x.echeance, 'montant', x.montant) order by x.rang), '[]'::jsonb)
                                 from public.cashd_echeances x where x.facture_id = f.id and x.actif))
                  order by f.date_emission), '[]'::jsonb)
               from public.cashd_factures_etat f where f.compte_id = c.id and (p_facture is null or f.id = p_facture)),
    'imputations', (select coalesce(jsonb_agg(jsonb_build_object('facture', f.numero, 'montant', x.montant, 'le', x.cree_le, 'annulee_le', x.annulee_le,
                                                                 'reglement', (select jsonb_build_object('recu_le', r.recu_le, 'montant', r.montant, 'mode', r.mode, 'reference', r.reference)
                                                                               from public.cashd_reglements r where r.id = x.reglement_id),
                                                                 'avoir', (select a.numero from public.cashd_factures a where a.id = x.avoir_id)) order by x.cree_le), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id
                    where f.compte_id = c.id and (p_facture is null or f.id = p_facture)),
    'relances', (select coalesce(jsonb_agg(jsonb_build_object('jour', r.jour, 'palier', r.palier, 'etat', case when exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id) then 'envoyee' else r.etat end, 'canal', r.canal, 'destinataire', r.destinataire_adresse,
                                                              'sujet', r.sujet, 'corps', r.corps, 'montant', r.montant, 'envoye_le', coalesce(r.envoye_le, (select m.envoye_le from public.cashd_envois_main m where m.relance_id = r.id)),
                                                              'envoi_main', (select jsonb_build_object('canal', m.canal, 'note', m.note) from public.cashd_envois_main m where m.relance_id = r.id),
                                                              'remise', (select jsonb_build_object('remise', e.remise, 'remise_le', e.remise_le) from public.envois e where e.id = r.envoi_id),
                                                              'reponse_le', (select x.reponse_le from public.cashd_relances x where x.id = r.id),
                                                              'motif', r.motif) order by r.jour), '[]'::jsonb)
                 from public.cashd_relances_etat r
                 where r.compte_id = c.id and (p_facture is null or exists (select 1 from public.cashd_relances_pieces p where p.relance_id = r.id and p.facture_id = p_facture))),
    'reponses', (select coalesce(jsonb_agg(jsonb_build_object('recu_le', x.recu_le, 'de', x.de_adresse, 'sujet', x.sujet, 'corps', left(x.corps, 4000)) order by x.recu_le), '[]'::jsonb)
                 from public.receptions x join public.cashd_relances r on r.envoi_id = x.en_reponse_a where r.compte_id = c.id),
    'pieces_jointes', (select coalesce(jsonb_agg(jsonb_build_object('facture', f.numero, 'nature', p.nature, 'nom', p.nom, 'chemin', p.chemin, 'le', p.cree_le)
                                                order by f.numero, p.cree_le), '[]'::jsonb)
                       from public.cashd_pieces_jointes p join public.cashd_factures f on f.id = p.facture_id
                       where f.compte_id = c.id and p.actif and (p_facture is null or f.id = p_facture)),
    'pdf_manquants', (select coalesce(jsonb_agg(f.numero order by f.numero), '[]'::jsonb) from public.cashd_factures f
                      where f.compte_id = c.id and f.nature in ('facture', 'acompte') and f.statut <> 'soldee' and (p_facture is null or f.id = p_facture)
                        and not exists (select 1 from public.cashd_pieces_jointes p where p.facture_id = f.id and p.actif and p.nature = 'facture_pdf')),
    'journal', (select coalesce(jsonb_agg(jsonb_build_object('le', j.survenu_le, 'action', j.action, 'par', j.acteur_libelle, 'donnees', j.donnees) order by j.id), '[]'::jsonb)
                from public.journal_opposable j
                where j.client_id = c.client_id and j.action like 'cashd.%'
                  and ((j.objet_type = 'cashd_comptes' and j.objet_id = c.id::text)
                       or (j.objet_type = 'cashd_factures' and j.objet_id in (select f.id::text from public.cashd_factures f where f.compte_id = c.id and (p_facture is null or f.id = p_facture)))
                       or (j.objet_type = 'cashd_relances' and j.objet_id in (select r.id::text from public.cashd_relances r where r.compte_id = c.id))))) end
  from (select 1) z left join public.cashd_comptes c on c.id = p_compte
$function$;


revoke execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) from public, anon;
revoke execute on function public.cashd_relances_du_jour(uuid, date) from public, anon;
revoke execute on function public.cashd_dossier(uuid, uuid, text) from public, anon;
grant execute on function public.cashd_noter_envoi_main(uuid, text, timestamptz, text) to authenticated, service_role;
grant execute on function public.cashd_relances_du_jour(uuid, date) to authenticated, service_role;
grant execute on function public.cashd_dossier(uuid, uuid, text) to authenticated, service_role;
