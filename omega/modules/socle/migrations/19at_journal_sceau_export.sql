-- 19at_journal_sceau_export.sql — le journal opposable du socle « ne se modifie pas, y compris par nous » : sceau à noter
-- hors d'Omega, vérification d'un sceau, export daté et empreint (A5, 18/10/2026, G18 du chiffrage CASHD, E4 ; sur le
-- modèle de FILED a4_46).
--
-- Ce qui existe déjà : public.journal_opposable est chaîné (hash = SHA-256 de la ligne et de hash_precedent, posé par
-- private.journaliser), protégé contre la modification, la suppression et le vidage, et public.verifier_journal_client
-- recalcule la chaîne. Ce qui manquait : un administrateur de la base qui couperait les déclencheurs pourrait retirer
-- les DERNIÈRES lignes (la chaîne restante reste intacte) ou tout recalculer ; rien ne le prouverait de l'extérieur.
--
-- Ce lot, sans réécrire aucune ligne existante :
--   · public.sceau_journal(client) : dernière ligne, son empreinte, le nombre de lignes, le verdict de la chaîne, et un
--     texte à noter HORS d'Omega (courriel, papier, horodatage qualifié éventuel). Chaque sceau donné est inscrit dans
--     private.journal_sceaux (ajout seul) ;
--   · public.verifier_sceau_journal(client, ligne, empreinte) : « confirme » si la ligne existe avec cette empreinte et
--     que la chaîne est intacte ; « ligne_disparue » ou « reecrit » sinon : un sceau noté ailleurs prouve qu'aucune
--     ligne jusqu'à lui n'a été retirée ni réécrite depuis ;
--   · public.exporter_journal(client, du, au) : les lignes, datées de l'export, avec l'empreinte SHA-256 de l'ensemble et
--     le sceau du moment (export horodaté par le serveur ; un horodatage qualifié eIDAS reste à brancher à part).
-- Gérant ou admin du client (auth.uid()), ou le service. Aucun DROP, aucune suppression, aucune ligne réécrite.

create table if not exists private.journal_sceaux (
  id          bigint generated always as identity primary key,
  client_id   uuid not null,
  ligne       bigint,
  empreinte   text check (empreinte ~ '^[0-9a-f]{64}$'),
  lignes      bigint not null,
  intacte     boolean not null,
  donne_par   uuid,
  donne_le    timestamptz not null default now()
);
comment on table private.journal_sceaux is
  'Lot 19at : chaque sceau du journal opposable donné (dernière ligne, empreinte, verdict). Ajout seul. Le sceau qui fait foi est celui noté hors d''Omega.';
revoke all on table private.journal_sceaux from public, anon, authenticated;
grant select, insert on table private.journal_sceaux to service_role;

create or replace function private.journal_sceaux_ajout_seul() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Les sceaux du journal ne se modifient ni ne se retirent.' using errcode = '42501';
end $$;
revoke all on function private.journal_sceaux_ajout_seul() from public, anon, authenticated;
do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'private.journal_sceaux'::regclass and tgname = 'journal_sceaux_ajout_seul') then
    create trigger journal_sceaux_ajout_seul before update or delete on private.journal_sceaux
      for each row execute function private.journal_sceaux_ajout_seul();
  end if;
end $do$;

-- Qui peut sceller, vérifier, exporter : le gérant ou un admin du client ; sans utilisateur, le service.
create or replace function private.journal_exiger_acteur(p_client uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seuls le gérant et les admins scellent, vérifient et exportent le journal.' using errcode = '42501';
  end if;
end $$;

-- La chaîne est-elle intacte ? Lecture tolérante du verdict de verifier_journal_client (sa forme varie selon la version).
create or replace function private.journal_intact(p_client uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  execute 'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.verifier_journal_client($1) x' into v using p_client;
  return not exists (
    select 1 from jsonb_array_elements(v) e cross join lateral jsonb_each(e) kv
    where (kv.key ~* '(faus|ruptur|rompu)' and jsonb_typeof(kv.value) <> 'null')
       or (kv.key ~* '^(ok|intacte?|valide)$' and kv.value = 'false'::jsonb));
end $$;

create or replace function public.sceau_journal(p_client uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_hash text; v_n bigint; v_intacte boolean;
begin
  perform private.journal_exiger_acteur(p_client);
  select j.id, encode(j.hash, 'hex') into v_id, v_hash
    from public.journal_opposable j where j.client_id = p_client order by j.id desc limit 1;
  select count(*) into v_n from public.journal_opposable j where j.client_id = p_client;
  v_intacte := private.journal_intact(p_client);
  insert into private.journal_sceaux (client_id, ligne, empreinte, lignes, intacte, donne_par)
  values (p_client, v_id, v_hash, v_n, v_intacte, (select auth.uid()));
  return jsonb_build_object('client', p_client, 'ligne', v_id, 'empreinte', v_hash, 'lignes', v_n, 'intacte', v_intacte,
    'le', now(),
    'texte', case when v_id is null then 'Journal vide : rien à sceller pour l''instant.'
                  else format('Journal opposable, ligne %s, empreinte %s (%s lignes, chaîne %s) : notez-la hors d''Omega. '
                              || 'Une vérification ultérieure qui la retrouve prouve qu''aucune ligne jusqu''à elle n''a été retirée ni réécrite.',
                              v_id, v_hash, v_n, case when v_intacte then 'intacte' else 'ROMPUE' end) end);
end $$;

create or replace function public.verifier_sceau_journal(p_client uuid, p_ligne bigint, p_empreinte text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_hash text; v_intacte boolean; v_verdict text;
begin
  perform private.journal_exiger_acteur(p_client);
  select encode(j.hash, 'hex') into v_hash from public.journal_opposable j where j.client_id = p_client and j.id = p_ligne;
  v_intacte := private.journal_intact(p_client);
  v_verdict := case when v_hash is null then 'ligne_disparue'
                    when v_hash is distinct from lower(btrim(p_empreinte)) then 'reecrit'
                    when not v_intacte then 'chaine_rompue'
                    else 'confirme' end;
  return jsonb_build_object('client', p_client, 'ligne', p_ligne, 'verdict', v_verdict, 'chaine_intacte', v_intacte,
    'empreinte_actuelle', v_hash, 'verifie_le', now());
end $$;

create or replace function public.exporter_journal(p_client uuid, p_du timestamptz default null, p_au timestamptz default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_lignes jsonb; v_sceau jsonb;
begin
  perform private.journal_exiger_acteur(p_client);
  select coalesce(jsonb_agg(jsonb_build_object('id', j.id, 'survenu_le', j.survenu_le, 'entite_id', j.entite_id,
           'acteur_type', j.acteur_type, 'acteur_id', j.acteur_id, 'acteur_libelle', j.acteur_libelle, 'action', j.action,
           'objet_type', j.objet_type, 'objet_id', j.objet_id, 'donnees', j.donnees,
           'hash_precedent', encode(j.hash_precedent, 'hex'), 'hash', encode(j.hash, 'hex')) order by j.id), '[]'::jsonb)
    into v_lignes
    from public.journal_opposable j
   where j.client_id = p_client and (p_du is null or j.survenu_le >= p_du) and (p_au is null or j.survenu_le < p_au);
  v_sceau := public.sceau_journal(p_client);
  return jsonb_build_object('client', p_client, 'exporte_le', now(), 'du', p_du, 'au', p_au,
    'nombre', jsonb_array_length(v_lignes), 'empreinte_sha256', encode(sha256(convert_to(v_lignes::text, 'UTF8')), 'hex'),
    'sceau', v_sceau, 'lignes', v_lignes);
end $$;

comment on function public.sceau_journal(uuid) is 'Lot 19at : le sceau du journal opposable (dernière ligne, empreinte), à noter hors d''Omega. Gérant ou admin, ou service.';
comment on function public.verifier_sceau_journal(uuid, bigint, text) is 'Lot 19at : confirme qu''un sceau noté ailleurs se retrouve et que la chaîne est intacte. Gérant ou admin, ou service.';
comment on function public.exporter_journal(uuid, timestamptz, timestamptz) is 'Lot 19at : export daté et empreint du journal opposable, avec le sceau du moment. Gérant ou admin, ou service.';

do $$ declare f text; begin
  foreach f in array array['private.journal_exiger_acteur(uuid)', 'private.journal_intact(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.sceau_journal(uuid)', 'public.verifier_sceau_journal(uuid, bigint, text)',
                           'public.exporter_journal(uuid, timestamptz, timestamptz)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
