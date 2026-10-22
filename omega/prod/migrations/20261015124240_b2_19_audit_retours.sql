-- 20261015124240 b2_19_audit_retours
-- Source : dépôt : 8838677 omega/modules/tavaro/migrations/b2_19_audit_retours.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b2_19_audit_retours.sql @ 8838677.
-- ═══ omega/modules/tavaro/migrations/b2_19_audit_retours.sql @ 8838677
-- b2_19 — L'audit de vingt retours et l'indicateur de fin de mois (chiffrage, lignes 19 et 57 : « L'audit commence par
-- vingt retours, pour mesurer ce qui a été facturé et ce qui ne l'a pas été » ; « un seul indicateur est lu à la fin du
-- mois »). Session B2, 15/10/2026.
--
--   · public.loc_audits, public.loc_audit_lignes : un audit, et pour chaque retour passé ce que le loueur avait facturé à
--     l'époque face à ce que Tavaro chiffre aujourd'hui sur le barème ;
--   · loc_ouvrir_audit(libelle), loc_auditer_retour(audit, contrat, retour, facture_historique_ttc) : le retour est
--     chiffré PAR SIMULATION. private.loc_chiffrer_retour tourne dans un sous-bloc annulé : aucune proposition, aucune
--     facture, aucune demande ne restent. Seul le résultat est gardé dans loc_audit_lignes ;
--   · loc_resultat_audit(audit) : les totaux, l'écart, l'écart pour cent retours, par famille de frais ;
--   · loc_indicateur_mois(mois) : l'indicateur unique, en euros TTC facturés (avoirs déduits) pour cent retours du mois,
--     face à l'« avant » du dernier audit clos.
-- Direction et valideurs. Idempotent ; aucune fonction du socle n'est modifiée.

create table if not exists public.loc_audits (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  libelle text not null,
  statut text not null default 'ouvert',
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  clos_le timestamp with time zone,
  maj_le timestamp with time zone not null default now(),
  constraint loc_audits_pkey primary key (id),
  constraint loc_audits_client_id_id_key unique (client_id, id),
  constraint loc_audits_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_audits_statut_check check (statut in ('ouvert', 'clos')),
  constraint loc_audits_clos check ((statut = 'clos') = (clos_le is not null)),
  constraint loc_audits_libelle check (char_length(btrim(libelle)) between 3 and 200)
);
create table if not exists public.loc_audit_lignes (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  audit_id uuid not null,
  contrat_id uuid not null,
  facture_historique_ttc numeric(12,2) not null,
  chiffre_ttc numeric(12,2) not null,
  chiffre_ht numeric(12,2) not null,
  statut_chiffrage text not null,
  lignes jsonb not null default '[]'::jsonb,
  avertissements jsonb not null default '[]'::jsonb,
  retour jsonb not null,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_audit_lignes_pkey primary key (id),
  constraint loc_audit_lignes_un unique (audit_id, contrat_id),
  constraint loc_audit_lignes_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_audit_lignes_audit_fkey foreign key (client_id, audit_id) references public.loc_audits(client_id, id) on delete cascade,
  constraint loc_audit_lignes_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_audit_lignes_montants check (facture_historique_ttc >= 0 and facture_historique_ttc <= 1000000)
);
comment on table public.loc_audits is 'b2_19 : audit des retours passés — ce qui a été facturé face à ce que le barème chiffre (simulation)';

do $$
declare t text;
begin
  foreach t in array array['loc_audits', 'loc_audit_lignes'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'direction lit les audits') then
      execute format($p$create policy "direction lit les audits" on public.%I for select to authenticated
                        using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin', 'valideur']))$p$, t);
    end if;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
  end loop;
end $$;

CREATE OR REPLACE FUNCTION public.loc_ouvrir_audit(p_libelle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Un audit s''ouvre par la direction ou un valideur.');
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_libelle, ''))) < 3 then
    raise exception 'Donnez un nom à l''audit (trois caractères au moins).' using errcode = '22023';
  end if;
  insert into public.loc_audits (client_id, libelle, cree_par) values (v_client, left(btrim(p_libelle), 200), (select auth.uid())) returning id into v_id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.audit_ouvert', 'loc_audits', v_id::text, jsonb_build_object('libelle', left(btrim(p_libelle), 200), 'par', (select auth.uid())), null);
  return jsonb_build_object('audit', v_id);
end $function$;

-- Un retour passé, chiffré par simulation. p_retour : les mêmes valeurs que loc_chiffrer_retour (retour_reel_le,
-- km_retour, carburant, dommages et postes avec leurs preuves) ; p_facture_historique_ttc : ce qui avait été facturé.
CREATE OR REPLACE FUNCTION public.loc_auditer_retour(p_audit uuid, p_contrat uuid, p_retour jsonb, p_facture_historique_ttc numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Un audit se mène par la direction ou un valideur.');
  a public.loc_audits;
  v_prop uuid;
  v_ttc numeric;
  v_ht numeric;
  v_statut text;
  v_lignes jsonb;
  v_avert jsonb;
  v_n integer;
begin
  select * into a from public.loc_audits where client_id = v_client and id = p_audit;
  if not found then
    raise exception 'Audit introuvable.' using errcode = 'P0002';
  end if;
  if a.statut <> 'ouvert' then
    raise exception 'Cet audit est clos.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.loc_contrats c where c.client_id = v_client and c.id = p_contrat) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if p_facture_historique_ttc is null or p_facture_historique_ttc < 0 then
    raise exception 'Le montant facturé à l''époque est obligatoire (0 si rien n''a été facturé).' using errcode = '22023';
  end if;
  if (select count(*) from public.loc_audit_lignes l where l.audit_id = a.id and l.contrat_id <> p_contrat) >= 100 then
    raise exception 'Un audit compte cent retours au plus.' using errcode = '23514';
  end if;
  -- la simulation : tout ce que le chiffrage écrit est annulé à la sortie du sous-bloc ; les variables restent
  begin
    v_prop := private.loc_chiffrer_retour(v_client, p_contrat, p_retour, 'saisie', (select auth.uid()));
    select p.total_ttc, p.total_ht, p.statut, coalesce(p.avertissements, '[]'::jsonb) into v_ttc, v_ht, v_statut, v_avert from public.loc_propositions p where p.id = v_prop;
    select coalesce(jsonb_agg(jsonb_build_object('code', l.code, 'famille', l.famille, 'libelle', l.libelle, 'montant_ttc', l.montant_ttc, 'statut', l.statut) order by l.rang), '[]'::jsonb)
      into v_lignes from public.loc_proposition_lignes l where l.proposition_id = v_prop;
    raise exception using errcode = 'B2AUD', message = 'simulation';
  exception when sqlstate 'B2AUD' then
    null;
  end;
  insert into public.loc_audit_lignes (client_id, audit_id, contrat_id, facture_historique_ttc, chiffre_ttc, chiffre_ht, statut_chiffrage, lignes, avertissements, retour, cree_par)
  values (v_client, a.id, p_contrat, round(p_facture_historique_ttc, 2), coalesce(v_ttc, 0), coalesce(v_ht, 0), coalesce(v_statut, 'calculee'), v_lignes, v_avert, p_retour, (select auth.uid()))
  on conflict on constraint loc_audit_lignes_un do update
    set facture_historique_ttc = excluded.facture_historique_ttc, chiffre_ttc = excluded.chiffre_ttc, chiffre_ht = excluded.chiffre_ht,
        statut_chiffrage = excluded.statut_chiffrage, lignes = excluded.lignes, avertissements = excluded.avertissements, retour = excluded.retour, cree_par = excluded.cree_par;
  select count(*) into v_n from public.loc_audit_lignes l where l.audit_id = a.id;
  return jsonb_build_object('audit', a.id, 'contrat', p_contrat, 'facture_historique_ttc', round(p_facture_historique_ttc, 2), 'chiffre_ttc', coalesce(v_ttc, 0),
                            'ecart_ttc', coalesce(v_ttc, 0) - round(p_facture_historique_ttc, 2), 'statut_chiffrage', v_statut, 'lignes', v_lignes, 'retours', v_n);
end $function$;

CREATE OR REPLACE FUNCTION public.loc_resultat_audit(p_audit uuid, p_clore boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Un audit se lit par la direction ou un valideur.');
  a public.loc_audits;
  v jsonb;
begin
  select * into a from public.loc_audits where client_id = v_client and id = p_audit;
  if not found then
    raise exception 'Audit introuvable.' using errcode = 'P0002';
  end if;
  select jsonb_build_object(
    'audit', a.id, 'libelle', a.libelle, 'statut', a.statut, 'retours', count(*),
    'facture_historique_ttc', coalesce(sum(l.facture_historique_ttc), 0), 'chiffre_ttc', coalesce(sum(l.chiffre_ttc), 0),
    'ecart_ttc', coalesce(sum(l.chiffre_ttc - l.facture_historique_ttc), 0),
    'historique_pour_100', case when count(*) > 0 then round(sum(l.facture_historique_ttc) * 100 / count(*), 2) end,
    'chiffre_pour_100', case when count(*) > 0 then round(sum(l.chiffre_ttc) * 100 / count(*), 2) end,
    'retours_sous_factures', count(*) filter (where l.chiffre_ttc > l.facture_historique_ttc + 0.005),
    'preuves_manquantes', count(*) filter (where l.statut_chiffrage = 'preuve_manquante'))
    into v
  from public.loc_audit_lignes l where l.audit_id = a.id;
  v := v || jsonb_build_object('par_famille', coalesce((
    select jsonb_object_agg(f, t) from (select x ->> 'famille' as f, round(sum((x ->> 'montant_ttc')::numeric), 2) as t
                                        from public.loc_audit_lignes l, jsonb_array_elements(l.lignes) x where l.audit_id = a.id group by 1) z), '{}'::jsonb));
  if coalesce(p_clore, false) and a.statut = 'ouvert' then
    if not private.a_un_role(v_client, array['gerant', 'admin']) then
      raise exception 'Un audit se clôt par la direction.' using errcode = '42501';
    end if;
    update public.loc_audits set statut = 'clos', clos_le = now() where id = a.id;
    perform private.journaliser_module(v_client, 'tavaro', 'tavaro.audit_clos', 'loc_audits', a.id::text, v || jsonb_build_object('par', (select auth.uid())), null);
    v := v || jsonb_build_object('statut', 'clos');
  end if;
  return v;
end $function$;

-- L'indicateur unique : euros TTC facturés (avoirs déduits) pour cent retours rendus dans le mois, et l'« avant » du
-- dernier audit clos.
CREATE OR REPLACE FUNCTION public.loc_indicateur_mois(p_mois date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'L''indicateur se lit par la direction ou un valideur.');
  v_fuseau text;
  v_debut date;
  v_retours integer;
  v_factures numeric;
  v_avoirs numeric;
  v_avant numeric;
  v_audit text;
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = v_client order by e.principale desc nulls last limit 1;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_debut := date_trunc('month', coalesce(p_mois, (now() at time zone v_fuseau)::date))::date;
  with retours as (
    select c.id, coalesce(c.retour_reel_le,
             (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p
               where p.client_id = c.client_id and p.contrat_id = c.id and p.entrees ? 'retour_reel_le')) as le
    from public.loc_contrats c where c.client_id = v_client and c.statut <> 'annule'
  )
  select count(*) into v_retours from retours r
  where r.le >= (v_debut::timestamp at time zone v_fuseau) and r.le < ((v_debut + interval '1 month')::timestamp at time zone v_fuseau);
  select coalesce(sum(f.total_ttc), 0) into v_factures from public.loc_factures f
  where f.client_id = v_client and f.date_facture >= v_debut and f.date_facture < (v_debut + interval '1 month')::date;
  -- les avoirs émis dans le mois (un avoir émis porte sa date)
  select coalesce(sum(v.montant_ttc), 0) into v_avoirs from public.loc_avoirs v
  where v.client_id = v_client and v.date_avoir >= v_debut and v.date_avoir < (v_debut + interval '1 month')::date;
  select a.libelle, round(sum(l.facture_historique_ttc) * 100 / nullif(count(*), 0), 2) into v_audit, v_avant
  from public.loc_audits a join public.loc_audit_lignes l on l.audit_id = a.id
  where a.client_id = v_client and a.statut = 'clos' group by a.id, a.libelle, a.clos_le order by a.clos_le desc limit 1;
  return jsonb_build_object('mois', to_char(v_debut, 'YYYY-MM'), 'retours', v_retours, 'factures_ttc', v_factures, 'avoirs_ttc', v_avoirs,
    'pour_100_retours', case when v_retours > 0 then round((v_factures - v_avoirs) * 100 / v_retours, 2) end,
    'avant_pour_100_retours', v_avant, 'audit', v_audit);
end $function$;

revoke all on function public.loc_ouvrir_audit(text) from public, anon;
revoke all on function public.loc_auditer_retour(uuid, uuid, jsonb, numeric) from public, anon;
revoke all on function public.loc_resultat_audit(uuid, boolean) from public, anon;
revoke all on function public.loc_indicateur_mois(date) from public, anon;
grant execute on function public.loc_ouvrir_audit(text) to authenticated, service_role;
grant execute on function public.loc_auditer_retour(uuid, uuid, jsonb, numeric) to authenticated, service_role;
grant execute on function public.loc_resultat_audit(uuid, boolean) to authenticated, service_role;
grant execute on function public.loc_indicateur_mois(date) to authenticated, service_role;
