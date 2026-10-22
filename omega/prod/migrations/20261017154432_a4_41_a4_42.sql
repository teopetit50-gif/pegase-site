-- 20261017154432 a4_41_a4_42
-- Source : dépôt : 546536b omega/migrations/a4_41_filed_lot33_purge_conservation.sql ; 85482aa omega/migrations/a4_42_filed_lot34_bilan_fichiers_gardes.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_41_filed_lot33_purge_conservation.sql @ 546536b, a4_42_filed_lot34_bilan_fichiers_gardes.sql @ 85482aa.
-- ═══ omega/migrations/a4_41_filed_lot33_purge_conservation.sql @ 546536b
-- FILED, lot 33 (a4_41) — À POSER À LA MAIN (coordinateur) : ce fichier contient une suppression.
--
-- Le dépôt légal d'a4_40 se garde dix ans après la clôture de l'exercice, puis s'efface : le garder plus longtemps
-- serait garder des données sans raison. Pour que la chaîne d'empreintes reste vérifiable jusqu'au bout, on ne purge
-- pas ligne à ligne (les termes ne suivent pas l'ordre de la chaîne) : le dépôt d'une organisation part en entier, le
-- jour où son DERNIER terme est passé (filed_conservation_clients.conserver_jusqu_au). Le garde-fou d'a4_40
-- (filed_conservation_scellee) refuse toujours toute suppression avant terme.
--   private.filed_purger_conservation()   purge les dépôts échus ; une ligne de constat par organisation dans
--                                         filed_conservation_purges (sans donnée : organisation, lignes, dernière
--                                         empreinte, date) ;
--   private.filed_produire_exports        (texte d'a4_33) l'appelle à chaque balayage, après les envois programmés.
-- Migration idempotente.

create table if not exists public.filed_conservation_purges (
  client_id   uuid not null,
  lignes      integer not null,
  empreinte   text not null,
  terme       date not null,
  purge_le    timestamptz not null default now(),
  primary key (client_id, purge_le)
);
comment on table public.filed_conservation_purges is 'Lot 33 (a4_41) : le constat de chaque purge du dépôt légal FILED à son terme (organisation, nombre de lignes, dernière empreinte). Aucune donnée de l''organisation.';
alter table public.filed_conservation_purges enable row level security;
revoke all on table public.filed_conservation_purges from public, anon, authenticated;
grant select on public.filed_conservation_purges to service_role;

create or replace function private.filed_purger_conservation()
returns integer language plpgsql security definer set search_path to '' as $$
declare r public.filed_conservation_clients; v_n integer; v_total integer := 0;
begin
  for r in select * from public.filed_conservation_clients c where c.conserver_jusqu_au < current_date order by c.conserver_jusqu_au for update skip locked loop
    -- Une ligne au terme plus lointain que l'en-tête (ne devrait pas arriver) retient tout le dépôt.
    if exists (select 1 from public.filed_conservation x where x.client_id = r.client_id and x.conserver_jusqu_au >= current_date) then
      update public.filed_conservation_clients set conserver_jusqu_au = (select max(x.conserver_jusqu_au) from public.filed_conservation x where x.client_id = r.client_id)
       where client_id = r.client_id;
      continue;
    end if;
    delete from public.filed_conservation x where x.client_id = r.client_id;
    get diagnostics v_n = row_count;
    insert into public.filed_conservation_purges (client_id, lignes, empreinte, terme) values (r.client_id, v_n, r.empreinte, r.conserver_jusqu_au);
    delete from public.filed_conservation_clients c where c.client_id = r.client_id;
    raise log 'FILED : dépôt légal de % purgé à son terme (% lignes, terme %)', r.client_id, v_n, r.conserver_jusqu_au;
    v_total := v_total + v_n;
  end loop;
  return v_total;
end $$;
revoke all on function private.filed_purger_conservation() from public, anon, authenticated;

-- Le balayage des exports (texte d'a4_33) purge aussi les dépôts échus.
create or replace function private.filed_produire_exports(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_exports_programmes; v_csv text; v_du date; v_au date; v_id uuid; v_n integer := 0;
begin
  for v_p in select * from public.filed_exports_programmes where actif and prochain_le <= p_aujourdhui order by prochain_le loop
    begin
      if v_p.cadence = 'hebdomadaire' then v_du := p_aujourdhui - 7; else v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_au := p_aujourdhui - 1;
      if v_p.tableau = 'engage' then v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_csv := private.filed_exporter_tableau(v_p.client_id, v_p.tableau, v_du, v_au, v_p.entite_id);
      insert into public.filed_exports (client_id, entite_id, programme_id, tableau, du, au, nb_lignes, sha256, contenu)
      values (v_p.client_id, v_p.entite_id, v_p.id, v_p.tableau, v_du, v_au, greatest(0, array_length(string_to_array(v_csv, E'\r\n'), 1) - 2),
              encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex'), v_csv)
      returning id into v_id;
      update public.filed_exports_programmes set dernier_le = p_aujourdhui, prochain_le = private.filed_prochain_export(cadence, jour, p_aujourdhui), maj_le = now() where id = v_p.id;
      perform private.lever_alerte_module(v_p.client_id, 'filed', 'info',
        left(format('Export prêt : %s (%s au %s)', v_p.tableau, to_char(v_du, 'DD/MM/YYYY'), to_char(v_au, 'DD/MM/YYYY')), 200),
        jsonb_build_object('export', v_id, 'programme', v_p.id, 'tableau', v_p.tableau),
        'export:' || v_id::text, true, v_p.destinataire);
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : export programmé % non produit (%)', v_p.id, sqlerrm;
      update public.filed_exports_programmes set prochain_le = p_aujourdhui + 1, maj_le = now() where id = v_p.id;
    end;
  end loop;
  v_n := v_n + private.filed_produire_envois(p_aujourdhui);
  -- Le dépôt légal échu (a4_41) : une purge ratée n'empêche pas les exports, elle se retente au balayage suivant.
  begin
    perform private.filed_purger_conservation();
  exception when others then
    raise warning 'FILED : purge du dépôt légal non faite (%)', sqlerrm;
  end;
  update public.filed_exports set contenu = null, purge_le = now() where contenu is not null and genere_le < now() - interval '90 days';
  return v_n;
end $$;



-- ═══ omega/migrations/a4_42_filed_lot34_bilan_fichiers_gardes.sql @ 85482aa
-- FILED, lot 34 (a4_42) — l'écran d'effacement dit aussi que les fichiers des pièces sont gardés.
--
-- Décision du coordinateur (17/10) : les fichiers des pièces sous conservation légale ne sont pas copiés par FILED ;
-- la préparation de l'effacement (private.preparer_effacement, A5) les exclut, les garde et les liste au manifeste.
-- Le bilan d'a4_40 (private.filed_bilan_effacement, texte repris, gen42.py) le dit : « gardés 10 ans, scellés,
-- exportables ». Migration idempotente ; aucune suppression.

create or replace function private.filed_bilan_effacement(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_garde jsonb; v_efface jsonb; v_terme date; r record; n bigint;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select jsonb_build_object(
           'registre', (select count(*) from public.filed_documents d where d.client_id = p_client),
           'archives', (select count(*) from public.filed_archives a where a.client_id = p_client),
           'factures', (select count(*) from public.filed_factures f where f.client_id = p_client),
           'ecritures', (select count(*) from public.filed_ecritures e where e.client_id = p_client))
    into v_garde;
  select max(t) into v_terme from (
    select private.filed_terme_conservation(e.client_id, e.entite_id, e.ecriture_date, e.exercice_id) t from public.filed_ecritures e where e.client_id = p_client
    union all
    select private.filed_terme_conservation(f.client_id, f.entite_id, f.date_emission) from public.filed_factures f where f.client_id = p_client
    union all
    select private.filed_terme_conservation(d.client_id, d.entite_id, (d.recu_le at time zone 'Europe/Paris')::date) from public.filed_documents d where d.client_id = p_client) s;
  v_efface := '{}'::jsonb;
  for r in select t.nom from private.tables_locataires t
            where t.nom like 'filed\_%' and t.nom not in ('filed_documents', 'filed_archives', 'filed_factures', 'filed_ecritures')
              and to_regclass('public.' || t.nom) is not null
            order by t.nom loop
    execute format('select count(*) from public.%I where client_id = $1', r.nom) into n using p_client;
    if n > 0 then v_efface := v_efface || jsonb_build_object(r.nom, n); end if;
  end loop;
  return jsonb_build_object(
    'garde', v_garde,
    'garde_jusqu_au', v_terme,
    'efface', v_efface,
    'fichiers', 'Les fichiers des pièces sont gardés dix ans, scellés, exportables : la préparation de l''effacement les exclut et les liste au manifeste.',
    'texte', concat_ws(' ',
      'Tout ce que FILED tient pour vous est effacé, sauf ce que la loi oblige à garder.',
      format('Le registre des pièces reçues (%s), les archives probantes (%s), les factures (%s), les écritures comptables (%s) et les fichiers des pièces sont gardés 10 ans après la clôture de leur exercice%s,',
             v_garde ->> 'registre', v_garde ->> 'archives', v_garde ->> 'factures', v_garde ->> 'ecritures',
             coalesce(', jusqu''au ' || to_char(v_terme, 'DD/MM/YYYY') || ' au plus tard', '')),
      'scellés (chaque ligne porte l''empreinte de la précédente), hors de votre espace, et exportables sur demande.',
      'Le reste — fournisseurs, imputations, contrôles, réglages, historique de traitement — est effacé.'));
end $$;
