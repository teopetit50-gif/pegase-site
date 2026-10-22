-- 20261018235537 c2_15_19at_a4_50_c3_14
-- Source : dépôt : 2278f180 omega/modules/cashd/migrations/c2_15_taux_bce.sql ; 30b9fc7a omega/modules/socle/migrations/19at_journal_sceau_export.sql ; 13dd758 omega/migrations/a4_50_filed_lot42_compteur_quotas.sql ; 13dd758 omega/migrations/a4_38_filed_lot30_reponses_fournisseurs.sql ; 81fae43c omega/modules/reput/migrations/c3_14_pieces_jointes.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_15_taux_bce.sql @ 2278f180, 19at_journal_sceau_export.sql @ 30b9fc7a, a4_50_filed_lot42_compteur_quotas.sql @ 13dd758, a4_38_filed_lot30_reponses_fournisseurs.sql @ 13dd758, c3_14_pieces_jointes.sql @ 81fae43c.
-- ═══ omega/modules/cashd/migrations/c2_15_taux_bce.sql @ 2278f180
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_15 : les taux de change de la BCE, chargés chaque jour ouvré (19/10/2026, session C2) — G17
-- ═══════════════════════════════════════════════════════════════════════════
-- « Les factures en devise étrangère sont suivies dans leur devise et en euros. » (C35) Jusqu'ici les taux se saisissaient
-- à la main (cashd_poser_taux). Désormais, chaque jour ouvré après la publication de la BCE (vers 16 h, heure de
-- Francfort), CASHD demande les taux de référence des devises présentes dans ses factures à l'API publique de la BCE
-- (data-api.ecb.europa.eu, sans compte, sans clé), par pg_net, de façon asynchrone ; un second passage lit la réponse
-- (CSV) et range les taux dans cashd_taux_change (source « bce », valables pour toutes les organisations ; 1 unité =
-- 1 / taux BCE euros). Un taux saisi par une organisation garde la priorité pour elle, comme avant.
-- Le modèle est celui de DALIRO (b6_21, météo) : rien n'attend une réponse, rien ne bloque la base.
--
-- Règles de pose : create … if not exists / create or replace ; cron.schedule si absent ; jamais de DROP ni de DELETE ;
-- RLS sans lecture directe (journal du serveur) ; revoke execute de public sur les fonctions.

-- Le journal des demandes à la BCE (une ligne par demande), lu et écrit par le serveur seul.
create table if not exists public.cashd_taux_demandes (
  id bigint generated always as identity primary key,
  demande_id bigint,
  devises text[] not null,
  demandee_le timestamptz not null default now(),
  recue_le timestamptz,
  taux_ranges integer,
  erreur text,
  constraint cashd_taux_demandes_check check (cardinality(devises) between 1 and 60 and char_length(erreur) <= 300)
);
alter table public.cashd_taux_demandes enable row level security;
revoke all on table public.cashd_taux_demandes from anon, authenticated;

-- L'adresse de la demande : les taux de référence quotidiens (EXR, D.<devises>.EUR.SP00.A), la dernière observation.
create or replace function private.cashd_taux_bce_adresse(p_devises text[])
 returns text language sql immutable set search_path to ''
as $function$
  select 'https://data-api.ecb.europa.eu/service/data/EXR/D.' || array_to_string(p_devises, '+') || '.EUR.SP00.A?lastNObservations=1&format=csvdata'
$function$;

-- Une réponse CSV de la BCE → (devise, jour, valeur BCE : 1 euro = valeur devise). Les colonnes sont lues par leur nom.
create or replace function private.cashd_taux_bce_lire_csv(p_csv text)
 returns table (devise text, jour date, valeur numeric)
 language plpgsql immutable set search_path to ''
as $function$
declare
  v_lignes text[] := regexp_split_to_array(btrim(replace(coalesce(p_csv, ''), E'\r', '')), E'\n');
  v_entete text[];
  v_c integer; v_t integer; v_v integer;
  v_champs text[];
  i integer;
begin
  if coalesce(array_length(v_lignes, 1), 0) < 2 then return; end if;
  v_entete := string_to_array(v_lignes[1], ',');
  v_c := array_position(v_entete, 'CURRENCY');
  v_t := array_position(v_entete, 'TIME_PERIOD');
  v_v := array_position(v_entete, 'OBS_VALUE');
  if v_c is null or v_t is null or v_v is null then
    raise exception 'Réponse de la BCE sans colonnes CURRENCY, TIME_PERIOD, OBS_VALUE.' using errcode = '22023';
  end if;
  for i in 2 .. array_length(v_lignes, 1) loop
    continue when btrim(v_lignes[i]) = '';
    v_champs := string_to_array(v_lignes[i], ',');
    continue when coalesce(v_champs[v_c], '') !~ '^[A-Z]{3}$' or coalesce(v_champs[v_t], '') !~ '^\d{4}-\d{2}-\d{2}$'
               or coalesce(v_champs[v_v], '') !~ '^\d+(\.\d+)?$' or v_champs[v_v]::numeric <= 0;
    devise := v_champs[v_c]; jour := v_champs[v_t]::date; valeur := v_champs[v_v]::numeric;
    return next;
  end loop;
end $function$;

-- Demander les taux du jour : les devises des factures (hors euro), une demande par jour au plus. Rend 1 si demandé.
create or replace function private.cashd_taux_bce_demander(p_maintenant timestamptz default now())
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare v_devises text[]; v_id bigint;
begin
  if to_regnamespace('net') is null then return 0; end if;
  if exists (select 1 from public.cashd_taux_demandes d where d.demandee_le > p_maintenant - interval '20 hours') then return 0; end if;
  select array_agg(distinct f.devise order by f.devise) into v_devises
  from public.cashd_factures f where f.devise is not null and f.devise <> 'EUR' and f.devise ~ '^[A-Z]{3}$';
  if v_devises is null then return 0; end if;
  v_devises := v_devises[1:60];
  begin
    execute 'select net.http_get($1, ''{}''::jsonb, ''{}''::jsonb, 15000)' into v_id using private.cashd_taux_bce_adresse(v_devises);
  exception when others then
    insert into public.cashd_taux_demandes (devises, demandee_le, recue_le, erreur)
    values (v_devises, p_maintenant, now(), left('Demande impossible : ' || sqlstate || ' ' || sqlerrm, 300));
    return 0;
  end;
  insert into public.cashd_taux_demandes (demande_id, devises, demandee_le) values (v_id, v_devises, p_maintenant);
  return 1;
end $function$;

-- Ranger un CSV de la BCE dans cashd_taux_change (taux globaux, source bce). Rend le nombre de taux rangés.
create or replace function private.cashd_taux_bce_ranger(p_csv text)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; x record;
begin
  for x in select * from private.cashd_taux_bce_lire_csv(p_csv) loop
    continue when x.devise = 'EUR';
    insert into public.cashd_taux_change (devise, jour, taux, source, client_id)
    values (x.devise, x.jour, round(1 / x.valeur, 8), 'bce', null)
    on conflict (devise, jour, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      do update set taux = excluded.taux, source = 'bce' where cashd_taux_change.source = 'bce';
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Lire les réponses arrivées (net._http_response) et ranger les taux.
create or replace function private.cashd_taux_bce_lire()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare d record; h record; n integer := 0; v_n integer;
begin
  if to_regclass('net._http_response') is null then return 0; end if;
  for d in select * from public.cashd_taux_demandes x where x.demande_id is not null and x.recue_le is null order by x.demandee_le limit 20 loop
    execute 'select x.status_code, x.content, x.timed_out, x.error_msg from net._http_response x where x.id = $1' into h using d.demande_id;
    if h is null or h.status_code is null and h.error_msg is null and not coalesce(h.timed_out, false) then
      if d.demandee_le < now() - interval '1 hour' then
        update public.cashd_taux_demandes set recue_le = now(), erreur = 'Pas de réponse de la BCE' where id = d.id;
      end if;
      continue;
    end if;
    if h.status_code = 200 and not coalesce(h.timed_out, false) then
      begin
        v_n := private.cashd_taux_bce_ranger(h.content::text);
        update public.cashd_taux_demandes set recue_le = now(), taux_ranges = v_n, erreur = null where id = d.id;
        n := n + v_n;
      exception when others then
        update public.cashd_taux_demandes set recue_le = now(), erreur = left('Réponse illisible : ' || sqlerrm, 300) where id = d.id;
      end;
    else
      update public.cashd_taux_demandes set recue_le = now(),
             erreur = left(format('BCE : %s %s', coalesce(h.status_code::text, ''), coalesce(h.error_msg, '')), 300) where id = d.id;
    end if;
    h := null;
  end loop;
  return n;
end $function$;

-- Le dernier taux connu de chaque devise des factures, et sa source (lecture pour l'écran et le point du matin).
create or replace function public.cashd_taux_connus(p_client uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('devise', d.devise, 'jour', t.jour, 'taux', t.taux, 'source', t.source) order by d.devise), '[]'::jsonb)
  from (select distinct f.devise from public.cashd_factures f where f.client_id = p_client and f.devise <> 'EUR') d
  left join lateral (select x.jour, x.taux, x.source from public.cashd_taux_change x
                     where x.devise = d.devise and (x.client_id is null or x.client_id = p_client)
                     -- le même choix que cashd_factures_etat (c2_03) : le taux de l'organisation d'abord, puis le plus récent
                     and x.jour <= (now() at time zone 'Europe/Paris')::date
                     order by (x.client_id is not null) desc, x.jour desc limit 1) t on true
$function$;

do $do$ begin
  if to_regnamespace('cron') is not null then
    if not exists (select 1 from cron.job where jobname = 'cashd-taux-bce') then
      perform cron.schedule('cashd-taux-bce', '35 15 * * 1-5', 'select private.cashd_taux_bce_demander()');
    end if;
    if not exists (select 1 from cron.job where jobname = 'cashd-taux-bce-lire') then
      perform cron.schedule('cashd-taux-bce-lire', '*/15 15-18 * * 1-5', 'select private.cashd_taux_bce_lire()');
    end if;
  end if;
end $do$;

revoke execute on function private.cashd_taux_bce_adresse(text[]) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_lire_csv(text) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_demander(timestamptz) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_ranger(text) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_lire() from public, anon, authenticated;
revoke execute on function public.cashd_taux_connus(uuid) from public, anon;
grant execute on function public.cashd_taux_connus(uuid) to authenticated, service_role;


-- ═══ omega/modules/socle/migrations/19at_journal_sceau_export.sql @ 30b9fc7a
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


-- ═══ omega/migrations/a4_50_filed_lot42_compteur_quotas.sql @ 13dd758
-- FILED, lot 42 (a4_50) — le compteur de pièces par mois et les quotas par palier (Teo, 18/10 ; chiffrage n° 21, 22).
--
-- « 20 / 100 / 500 factures par mois » ; « vous payez les pièces, pas les utilisateurs » ; « vous changez de palier d'un
-- mois sur l'autre ». Réglages techniques seulement (décision du 17/10) : AUCUN prix ici.
--   · public.filed_paliers : Découverte, Standard, Entreprise (lib/produits/factures.ts) — pièces par mois, boîtes,
--     seuil d'alerte (80 %), conduite au dépassement. Réglés par l'opérateur (service_role) ;
--   · public.filed_abonnements : le palier de l'organisation, et le palier suivant qui prend effet le 1er du mois
--     suivant (un premier palier prend effet tout de suite). Une organisation SANS abonnement n'a pas de quota : rien ne
--     change pour les clients actuels ;
--   · public.filed_compteurs_pieces (et non filed_compteurs, la numérotation du socle) : chaque mois (heure de Paris), les pièces reçues (hors doublons de fichier déjà reçus),
--     tenues par un déclencheur sur filed_documents ; à 80 % puis au dépassement, une alerte au gérant, une seule fois ;
--   · au dépassement : « prevenir » (par défaut) ou « facturer » (les pièces hors quota sont comptées pour la facture).
--     Le blocage n'est PAS proposé : refuser une pièce reçue ferait perdre une facture ; c'est une décision de Teo.
-- Portes : filed_compteur, filed_compteurs_mois (gérant, admin, valideur) ; filed_changer_palier (gérant, admin, ou
-- l'opérateur) ; filed_regler_palier (opérateur seulement). Migration idempotente ; aucun DROP, aucune suppression ;
-- aucun envoi (les alertes restent dans Omega).

create table if not exists public.filed_paliers (
  code          text primary key check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  libelle       text not null,
  pieces_mois   integer check (pieces_mois is null or pieces_mois > 0),      -- nul : illimité
  boites        integer check (boites is null or boites > 0),                -- nul : illimitées (lot 43)
  historique_mois integer check (historique_mois is null or historique_mois > 0), -- nul : complet (lot 47)
  alerte_pct    integer not null default 80 check (alerte_pct between 1 and 100),
  depassement   text not null default 'prevenir' check (depassement in ('prevenir', 'facturer')),
  rang          integer not null default 100,
  actif         boolean not null default true,
  maj_le        timestamptz not null default now()
);
comment on table public.filed_paliers is
  'Lot 42 (a4_50) : les paliers FILED (réglages techniques, sans prix) : pièces par mois, boîtes, historique, alerte, dépassement. Opérateur.';
insert into public.filed_paliers (code, libelle, pieces_mois, boites, historique_mois, rang) values
  ('DECOUVERTE', 'Découverte', 20, 1, null, 10),
  ('STANDARD',   'Standard',   100, 2, null, 20),
  ('ENTREPRISE', 'Entreprise', 500, null, null, 30)
on conflict (code) do nothing;

create table if not exists public.filed_abonnements (
  client_id       uuid primary key references public.clients(id) on delete cascade,
  palier          text not null references public.filed_paliers(code),
  depuis          date not null default current_date,
  palier_suivant  text references public.filed_paliers(code),
  suivant_le      date,
  maj_par         uuid,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
comment on table public.filed_abonnements is
  'Lot 42 (a4_50) : le palier FILED de l''organisation ; un changement prend effet le 1er du mois suivant.';

create table if not exists public.filed_compteurs_pieces (
  client_id   uuid not null references public.clients(id) on delete cascade,
  mois        date not null check (mois = date_trunc('month', mois)::date),
  pieces      integer not null default 0,
  doublons    integer not null default 0,
  palier      text,
  quota       integer,
  alerte_le   timestamptz,
  depasse_le  timestamptz,
  maj_le      timestamptz not null default now(),
  primary key (client_id, mois)
);
comment on table public.filed_compteurs_pieces is
  'Lot 42 (a4_50) : les pièces reçues par organisation et par mois (heure de Paris), hors doublons de fichier ; le quota du mois.';

do $$
declare t text;
begin
  foreach t in array array['filed_paliers', 'filed_abonnements', 'filed_compteurs_pieces'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  grant select on public.filed_paliers to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_paliers' and policyname = 'filed_paliers_lecture') then
    create policy filed_paliers_lecture on public.filed_paliers for select to authenticated using (true);
  end if;
  foreach t in array array['filed_abonnements', 'filed_compteurs_pieces'] loop
    execute format('grant select on public.%I to authenticated', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_lecture') then
      execute format('create policy %I on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t || '_lecture', t);
    end if;
  end loop;
end $$;
create or replace trigger filed_paliers_maj_le before update on public.filed_paliers for each row execute function private.filed_lot4_maj_le();
create or replace trigger filed_abonnements_maj_le before update on public.filed_abonnements for each row execute function private.filed_lot4_maj_le();

insert into private.tables_locataires (nom, ordre_effacement, note)
select x.nom, x.ordre, 'FILED, lot 42' from (values ('filed_compteurs_pieces', 34), ('filed_abonnements', 35)) x(nom, ordre)
where not exists (select 1 from private.tables_locataires t where t.nom = x.nom);

-- Le palier en vigueur pour un mois donné (nul : pas d'abonnement, pas de quota).
create or replace function private.filed_palier_du(p_client uuid, p_mois date default current_date)
returns public.filed_paliers language sql stable security definer set search_path to '' as $$
  select p.* from public.filed_abonnements a
    join public.filed_paliers p on p.code = case when a.palier_suivant is not null and a.suivant_le <= date_trunc('month', p_mois)::date
                                                 then a.palier_suivant else a.palier end
   where a.client_id = p_client and a.depuis <= (date_trunc('month', p_mois) + interval '1 month - 1 day')::date
$$;
revoke all on function private.filed_palier_du(uuid, date) from public, anon, authenticated;
grant execute on function private.filed_palier_du(uuid, date) to service_role;

-- Le déclencheur : chaque document reçu compte dans le mois de sa réception ; les alertes, une fois par mois.
create or replace function private.filed_compter_piece()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', (new.recu_le at time zone 'Europe/Paris'))::date; v_p public.filed_paliers; c public.filed_compteurs_pieces;
begin
  v_p := private.filed_palier_du(new.client_id, v_mois);
  insert into public.filed_compteurs_pieces as k (client_id, mois, pieces, doublons, palier, quota)
  values (new.client_id, v_mois, case when new.doublon_de is null then 1 else 0 end, case when new.doublon_de is null then 0 else 1 end,
          v_p.code, v_p.pieces_mois)
  on conflict (client_id, mois) do update
    set pieces = k.pieces + case when new.doublon_de is null then 1 else 0 end,
        doublons = k.doublons + case when new.doublon_de is null then 0 else 1 end,
        palier = coalesce(v_p.code, k.palier), quota = v_p.pieces_mois, maj_le = now()
  returning * into c;
  if c.quota is not null then
    if c.alerte_le is null and c.pieces >= ceil(c.quota * v_p.alerte_pct / 100.0) and c.pieces <= c.quota then
      update public.filed_compteurs_pieces set alerte_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('FILED : %s pièces reçues ce mois sur %s prévues au palier %s.', c.pieces, c.quota, v_p.libelle), 200),
        jsonb_build_object('mois', c.mois, 'pieces', c.pieces, 'quota', c.quota, 'palier', c.palier),
        'filed:quota:alerte:' || to_char(c.mois, 'YYYY-MM'), true, null);
    end if;
    if c.depasse_le is null and c.pieces > c.quota then
      update public.filed_compteurs_pieces set depasse_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('FILED : le quota du palier %s (%s pièces) est dépassé ce mois ; les pièces continuent d''être lues%s.', v_p.libelle, c.quota,
                    case when v_p.depassement = 'facturer' then ', le dépassement est compté' else '' end), 200),
        jsonb_build_object('mois', c.mois, 'pieces', c.pieces, 'quota', c.quota, 'palier', c.palier, 'depassement', v_p.depassement),
        'filed:quota:depasse:' || to_char(c.mois, 'YYYY-MM'), true, null);
    end if;
  end if;
  return null;
exception when others then
  -- Le compteur ne doit jamais empêcher une pièce d'arriver.
  raise warning 'FILED : compteur non tenu pour le document % (%)', new.id, sqlerrm;
  return null;
end $$;
revoke all on function private.filed_compter_piece() from public, anon, authenticated;
grant execute on function private.filed_compter_piece() to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_compter') then
    create trigger filed_documents_compter after insert on public.filed_documents for each row execute function private.filed_compter_piece();
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- Les portes
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_compteur(p_client uuid, p_mois date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date; c public.filed_compteurs_pieces;
        v_p public.filed_paliers; v_a public.filed_abonnements;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  select * into c from public.filed_compteurs_pieces k where k.client_id = p_client and k.mois = v_mois;
  v_p := private.filed_palier_du(p_client, v_mois);
  select * into v_a from public.filed_abonnements a where a.client_id = p_client;
  return jsonb_build_object('mois', v_mois, 'pieces', coalesce(c.pieces, 0), 'doublons', coalesce(c.doublons, 0),
    'palier', v_p.code, 'libelle', v_p.libelle, 'quota', v_p.pieces_mois,
    'pourcentage', case when v_p.pieces_mois is not null then round(100.0 * coalesce(c.pieces, 0) / v_p.pieces_mois, 1) end,
    'hors_quota', case when v_p.pieces_mois is not null then greatest(coalesce(c.pieces, 0) - v_p.pieces_mois, 0) else 0 end,
    'depassement', v_p.depassement,
    'etat', case when v_p.pieces_mois is null then 'sans_quota'
                 when coalesce(c.pieces, 0) > v_p.pieces_mois then 'depasse'
                 when coalesce(c.pieces, 0) >= ceil(v_p.pieces_mois * v_p.alerte_pct / 100.0) then 'alerte'
                 else 'ok' end,
    'palier_suivant', v_a.palier_suivant, 'suivant_le', v_a.suivant_le);
end $$;
revoke all on function private.filed_compteur(uuid, date) from public, anon;
grant execute on function private.filed_compteur(uuid, date) to authenticated, service_role;
create or replace function public.filed_compteur(p_client uuid, p_mois date default null)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_compteur(p_client, p_mois) $$;
comment on function public.filed_compteur(uuid, date) is
  'Lot 42 (a4_50) : les pièces du mois, le quota du palier, l''état (ok, alerte, dépassé, sans quota). Gérant, admin, valideur.';
revoke all on function public.filed_compteur(uuid, date) from public, anon;
grant execute on function public.filed_compteur(uuid, date) to authenticated, service_role;

create or replace function private.filed_compteurs_mois(p_client uuid, p_mois integer default 12)
returns table (mois date, pieces integer, doublons integer, palier text, quota integer, hors_quota integer)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  return query select k.mois, k.pieces, k.doublons, k.palier, k.quota, case when k.quota is null then 0 else greatest(k.pieces - k.quota, 0) end
    from public.filed_compteurs_pieces k where k.client_id = p_client
     and k.mois > (date_trunc('month', now() at time zone 'Europe/Paris') - make_interval(months => greatest(coalesce(p_mois, 12), 1)))::date
   order by k.mois desc;
end $$;
revoke all on function private.filed_compteurs_mois(uuid, integer) from public, anon;
grant execute on function private.filed_compteurs_mois(uuid, integer) to authenticated, service_role;
create or replace function public.filed_compteurs_mois(p_client uuid, p_mois integer default 12)
returns table (mois date, pieces integer, doublons integer, palier text, quota integer, hors_quota integer)
language sql stable set search_path to '' as $$ select * from private.filed_compteurs_mois(p_client, p_mois) $$;
comment on function public.filed_compteurs_mois(uuid, integer) is 'Lot 42 (a4_50) : les compteurs des derniers mois (pièces, doublons, quota, hors quota). Gérant, admin, valideur.';
revoke all on function public.filed_compteurs_mois(uuid, integer) from public, anon;
grant execute on function public.filed_compteurs_mois(uuid, integer) to authenticated, service_role;

-- Changer de palier : au 1er du mois suivant ; le premier palier prend effet tout de suite.
create or replace function private.filed_changer_palier(p_client uuid, p_palier text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_code text := upper(btrim(coalesce(p_palier, ''))); v_a public.filed_abonnements;
        v_debut date := date_trunc('month', (now() at time zone 'Europe/Paris'))::date;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if not exists (select 1 from public.filed_paliers p where p.code = v_code and p.actif) then
    raise exception 'Palier inconnu : %.', v_code using errcode = '22023';
  end if;
  select * into v_a from public.filed_abonnements a where a.client_id = p_client for update;
  if not found then
    insert into public.filed_abonnements (client_id, palier, depuis, maj_par) values (p_client, v_code, v_debut, v_par) returning * into v_a;
    update public.filed_compteurs_pieces k set palier = v_code, quota = (select p.pieces_mois from public.filed_paliers p where p.code = v_code)
     where k.client_id = p_client and k.mois = v_debut;
  else
    -- Un palier suivant déjà échu devient le palier courant.
    if v_a.palier_suivant is not null and v_a.suivant_le <= v_debut then
      v_a.palier := v_a.palier_suivant;
    end if;
    update public.filed_abonnements
       set palier = v_a.palier,
           palier_suivant = case when v_code = v_a.palier then null else v_code end,
           suivant_le = case when v_code = v_a.palier then null else (v_debut + interval '1 month')::date end,
           maj_par = v_par
     where client_id = p_client returning * into v_a;
  end if;
  perform private.filed_journaliser(p_client, 'filed.palier.changement', 'filed_abonnement', p_client::text,
    jsonb_build_object('palier', v_a.palier, 'suivant', v_a.palier_suivant, 'le', v_a.suivant_le));
  return jsonb_build_object('palier', v_a.palier, 'palier_suivant', v_a.palier_suivant, 'suivant_le', v_a.suivant_le);
end $$;
revoke all on function private.filed_changer_palier(uuid, text) from public, anon;
grant execute on function private.filed_changer_palier(uuid, text) to authenticated, service_role;
create or replace function public.filed_changer_palier(p_client uuid, p_palier text)
returns jsonb language sql set search_path to '' as $$ select private.filed_changer_palier(p_client, p_palier) $$;
comment on function public.filed_changer_palier(uuid, text) is
  'Lot 42 (a4_50) : choisit le palier FILED ; un changement prend effet le 1er du mois suivant, un premier palier tout de suite. Gérant, admin ou opérateur.';
revoke all on function public.filed_changer_palier(uuid, text) from public, anon;
grant execute on function public.filed_changer_palier(uuid, text) to authenticated, service_role;

-- Les seuils d'un palier : l'opérateur seulement.
create or replace function public.filed_regler_palier(p_code text, p_pieces_mois integer, p_boites integer, p_historique_mois integer,
                                                      p_alerte_pct integer default 80, p_depassement text default 'prevenir')
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.filed_paliers set pieces_mois = p_pieces_mois, boites = p_boites, historique_mois = p_historique_mois,
         alerte_pct = coalesce(p_alerte_pct, 80), depassement = coalesce(p_depassement, 'prevenir')
   where code = upper(btrim(p_code));
  if not found then raise exception 'Palier inconnu : %.', p_code using errcode = '22023'; end if;
end $$;
comment on function public.filed_regler_palier(text, integer, integer, integer, integer, text) is
  'Lot 42 (a4_50) : règle les seuils d''un palier (pièces par mois, boîtes, historique, alerte, dépassement). Opérateur (service_role).';
revoke all on function public.filed_regler_palier(text, integer, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.filed_regler_palier(text, integer, integer, integer, integer, text) to service_role;


-- ═══ omega/migrations/a4_38_filed_lot30_reponses_fournisseurs.sql @ 13dd758
-- FILED, lot 30 (a4_38) — « rédige ce qui repart », en minimal : FILED écrit, une personne valide, rien ne part seul.
--
-- Promesse du site (accueil:704, chiffrage n° 125) ; décision de Teo le 17/10 : un brouillon de réponse au
-- fournisseur, de trois sortes, toujours validé par une personne, jamais d'envoi sans elle :
--   piece_manquante  le message est arrivé sans facture lisible : on demande la pièce ;
--   contestation     la facture ne peut pas être réglée en l'état : on dit pourquoi (motif donné, sinon les contrôles
--                    bloquants de la facture) et l'on demande un avoir ou une facture rectificative ;
--   confirmation     on accuse réception : numéro, date, montant, référence de réception, échéance.
-- public.filed_preparer_reponse(document, sorte, motif?, adresse?, sujet?, corps?) rédige (ou reprend le texte de la
-- personne), range le brouillon dans filed_reponses et dépose une demande de validation « filed.repondre » — inscrite
-- aux actions qu'aucun accord permanent ne couvre (private.actions_sans_accord). Le courriel est préparé par
-- private.preparer_envoi ADOSSÉ à cette demande (comme CASHD) : il ne part que si une personne l'approuve ; refusée,
-- expirée ou annulée, il ne part pas. Si l'envoi par courriel n'est pas réglé pour FILED, ou si le socle verrouille
-- le courriel d'emblée (statut bloque), le brouillon reste validable et lisible (non_reglee) : la personne l'envoie elle-même. La décision est exécutée par
-- private.filed_executer_decision (texte d'a4_08, une branche ajoutée ; gen38.py).
-- Migration idempotente ; aucune suppression.

create table if not exists public.filed_reponses (
  id                   uuid primary key default gen_random_uuid(),
  client_id            uuid not null references public.clients(id) on delete cascade,
  entite_id            uuid references public.entites(id) on delete cascade,
  document_id          uuid not null references public.filed_documents(id) on delete cascade,
  facture_id           uuid references public.filed_factures(id) on delete set null,
  sorte                text not null check (sorte in ('piece_manquante', 'contestation', 'confirmation')),
  destinataire_adresse text,
  destinataire_nom     text,
  sujet                text not null check (char_length(sujet) between 1 and 200),
  corps                text not null check (char_length(corps) between 1 and 8000),
  statut               text not null default 'a_valider' check (statut in ('a_valider', 'non_reglee', 'validee', 'refusee', 'expiree', 'bloquee')),
  demande_id           uuid,
  envoi_id             uuid,
  motif                text,
  prepare_par          uuid,
  prepare_le           timestamptz not null default now(),
  decide_par           uuid,
  decide_le            timestamptz
);
comment on table public.filed_reponses is
  'Lot 30 (a4_38) : les brouillons de réponse aux fournisseurs (pièce manquante, contestation, confirmation). Chacun attend la validation d''une personne ; le courriel, adossé à la demande, ne part qu''approuvé.';
create index if not exists filed_reponses_document on public.filed_reponses (document_id);
create index if not exists filed_reponses_a_valider on public.filed_reponses (client_id) where statut in ('a_valider', 'non_reglee');
alter table public.filed_reponses enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reponses' and policyname = 'filed_reponses_lecture') then
    execute 'create policy filed_reponses_lecture on public.filed_reponses for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke all on table public.filed_reponses from anon, authenticated;
grant select on public.filed_reponses to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_reponses', 2, 'FILED, lot 30')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_reponses', 'filed_document', 'document_id', 3)
on conflict do nothing;

-- « filed.repondre » : jamais couvert par un accord permanent. La table du socle n'est connue ici que par son nom :
-- on remplit les colonnes qu'elle a (module, type_action, et un motif s'il en faut un).
do $$
declare v_cols text := 'module, type_action'; v_vals text := quote_literal('filed') || ', ' || quote_literal('filed.repondre');
begin
  if to_regclass('private.actions_sans_accord') is null then return; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'private' and table_name = 'actions_sans_accord' and column_name = 'motif') then
    v_cols := v_cols || ', motif';
    v_vals := v_vals || ', ' || quote_literal('Un courriel à un fournisseur part toujours sur la validation d''une personne (FILED, a4_38).');
  end if;
  execute format('insert into private.actions_sans_accord (%s) select %s where not exists (select 1 from private.actions_sans_accord where module = %L and type_action = %L)',
                 v_cols, v_vals, 'filed', 'filed.repondre');
end $$;

-- Le texte d'une réponse, sobre et factuel. Rend (sujet, corps).
create or replace function private.filed_rediger_reponse(p_document uuid, p_sorte text, p_motif text default null)
returns table (sujet text, corps text) language plpgsql stable security definer set search_path to '' as $$
declare v_d public.filed_documents; v_f public.filed_factures; v_e text; v_motifs text; v_ech date; v_n text := chr(10);
begin
  select * into v_d from public.filed_documents where id = p_document;
  select * into v_f from public.filed_factures where document_id = p_document;
  select e.nom into v_e from public.entites e where e.id = v_d.entite_id;
  v_ech := coalesce(v_f.echeance_lue, null);
  if p_sorte = 'piece_manquante' then
    sujet := left(format('Facture à nous renvoyer — votre envoi du %s', to_char(v_d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY')), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous avons bien reçu votre envoi du %s (notre référence %s), mais la facture n''y est pas jointe ou n''est pas lisible.',
             to_char(v_d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY'), coalesce(v_d.reference, 'en attente')),
      coalesce(nullif(btrim(p_motif), ''), null),
      'Pourriez-vous nous la renvoyer en pièce jointe, au format PDF (ou Factur-X) ? Elle sera traitée dès réception.', '',
      'Cordialement,', coalesce(v_e, ''));
  elsif p_sorte = 'contestation' then
    if v_f.id is null then raise exception 'Une contestation porte sur une facture : ce document n''en est pas une.' using errcode = '22023'; end if;
    v_motifs := nullif(btrim(p_motif), '');
    if v_motifs is null then
      select string_agg('- ' || c.message, v_n order by c.code) into v_motifs
        from public.filed_controles c where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    end if;
    if v_motifs is null then raise exception 'Dites ce qui est contesté : aucun contrôle bloquant ne le dit pour cette facture.' using errcode = '22023'; end if;
    sujet := left(format('Votre facture %s — à rectifier avant règlement', coalesce(v_f.numero, v_d.reference)), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous avons bien reçu votre facture %s du %s, d''un montant de %s %s (notre référence %s).',
             coalesce(v_f.numero, 'sans numéro'), coalesce(to_char(v_f.date_emission, 'DD/MM/YYYY'), 'date non lue'),
             coalesce(replace(to_char(v_f.montant_ttc, 'FM999999990.00'), '.', ','), '?'), coalesce(v_f.devise, 'EUR'), coalesce(v_d.reference, '')),
      'Nous ne pouvons pas la régler en l''état :', v_motifs, '',
      'Merci de nous adresser un avoir ou une facture rectificative ; nous la traiterons dès réception.', '',
      'Cordialement,', coalesce(v_e, ''));
  elsif p_sorte = 'confirmation' then
    if v_f.id is null then raise exception 'Une confirmation porte sur une facture : ce document n''en est pas une.' using errcode = '22023'; end if;
    sujet := left(format('Bonne réception de votre facture %s', coalesce(v_f.numero, v_d.reference)), 200);
    corps := concat_ws(v_n,
      'Bonjour,', '',
      format('Nous accusons réception de votre facture %s du %s, d''un montant de %s %s.',
             coalesce(v_f.numero, 'sans numéro'), coalesce(to_char(v_f.date_emission, 'DD/MM/YYYY'), 'date non lue'),
             coalesce(replace(to_char(v_f.montant_ttc, 'FM999999990.00'), '.', ','), '?'), coalesce(v_f.devise, 'EUR')),
      format('Elle est enregistrée sous notre référence %s%s.', coalesce(v_d.reference, ''),
             coalesce(', échéance au ' || to_char(v_ech, 'DD/MM/YYYY'), '')),
      coalesce(nullif(btrim(p_motif), ''), null), '',
      'Cordialement,', coalesce(v_e, ''));
  else
    raise exception 'Sorte de réponse inconnue : piece_manquante, contestation ou confirmation.' using errcode = '22023';
  end if;
  return next;
end $$;
revoke all on function private.filed_rediger_reponse(uuid, text, text) from public, anon, authenticated;

create or replace function private.filed_preparer_reponse(p_document uuid, p_sorte text, p_motif text default null, p_adresse text default null,
                                                         p_sujet text default null, p_corps text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_d public.filed_documents; v_f public.filed_factures; v_uid uuid; v_t record; v_id uuid := gen_random_uuid(); v_adresse text;
  v_nom text; v_dem uuid; v_dstatut text; v_dpol uuid; v_envoi uuid; v_err text; v_sujet text; v_corps text;
  v_estatut text; v_everrou text; v_emotif text;
begin
  select * into v_d from public.filed_documents where id = p_document;
  if not found then raise exception 'Document introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_d.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_d.entite_id);
  if v_uid is not null and not private.voit_objet(v_d.client_id, 'filed_document', v_d.id::text) then
    raise exception 'Document introuvable.' using errcode = 'P0002';
  end if;
  select * into v_f from public.filed_factures where document_id = p_document;
  select * into v_t from private.filed_rediger_reponse(p_document, p_sorte, p_motif);
  v_sujet := left(coalesce(nullif(btrim(p_sujet), ''), v_t.sujet), 200);
  v_corps := left(coalesce(nullif(btrim(p_corps), ''), v_t.corps), 8000);
  v_adresse := lower(btrim(coalesce(nullif(btrim(p_adresse), ''), substring(v_d.expediteur from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'))));
  if v_adresse is not null and v_adresse !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'Adresse du destinataire invalide.' using errcode = '22023';
  end if;
  select fo.nom into v_nom from public.filed_fournisseurs fo where fo.id = v_f.fournisseur_id;
  insert into public.filed_reponses (id, client_id, entite_id, document_id, facture_id, sorte, destinataire_adresse, destinataire_nom, sujet, corps, prepare_par)
  values (v_id, v_d.client_id, v_d.entite_id, v_d.id, v_f.id, p_sorte, v_adresse, v_nom, v_sujet, v_corps, v_uid);

  -- La demande : une personne valide, toujours (filed.repondre n'est couvert par aucun accord permanent).
  v_dem := private.filed_deposer_demande(v_d.client_id, v_d.entite_id, 'filed.repondre', 'filed_document', v_d.id::text,
    left(format('Réponse au fournisseur (%s) : %s', replace(p_sorte, '_', ' '), v_sujet), 500), null,
    jsonb_build_object('reponse', v_id, 'sorte', p_sorte, 'destinataire', v_adresse, 'sujet', v_sujet, 'corps', v_corps),
    'filed:repondre:' || v_id::text);
  select d.statut, d.politique_id into v_dstatut, v_dpol from public.demandes_validation d where d.id = v_dem;
  update public.filed_reponses set demande_id = v_dem where id = v_id;
  if v_dstatut = 'approuvee' and v_dpol is not null then
    update public.filed_reponses set statut = 'bloquee', motif = 'Un accord permanent l''a approuvée d''office : une réponse à un fournisseur exige une personne. Rien n''est préparé.'
     where id = v_id;
    perform private.lever_alerte_module(v_d.client_id, 'filed', 'attention',
      'Une réponse au fournisseur n''a pas été préparée : un accord permanent la couvrait, et elle exige la validation d''une personne.',
      jsonb_build_object('reponse', v_id, 'politique', v_dpol), 'reponse:accord:' || v_id::text, true, null);
    return v_id;
  end if;

  -- Le courriel, adossé à la demande : il ne part que si elle est approuvée.
  if v_adresse is null then
    update public.filed_reponses set statut = 'non_reglee', motif = 'Pas d''adresse de destinataire : le brouillon est à valider puis à envoyer par la personne.' where id = v_id;
  elsif to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamp with time zone,jsonb)') is null then
    update public.filed_reponses set statut = 'non_reglee', motif = 'L''envoi par courriel n''existe pas sur cette base : le brouillon est à valider puis à envoyer par la personne.' where id = v_id;
  else
    begin
      execute 'select private.preparer_envoi($1, ''filed'', ''filed_document'', $2, ''email'', $3, null, ''{}''::jsonb, $4, $5, null::uuid[], $6, $7, false, false, $8, $9)'
        into v_envoi
        using v_d.client_id, v_d.id::text, jsonb_build_object('adresse', v_adresse, 'nom', coalesce(v_nom, v_adresse), 'professionnel', true),
              v_sujet, v_corps, 'filed:reponse:' || v_id::text, v_d.entite_id, now() + interval '30 days', jsonb_build_object('demande', v_dem);
      update public.filed_reponses set envoi_id = v_envoi where id = v_id;
      -- Le socle peut refuser le courriel d'emblée (verrou : adresse, réglage, opposition…) : il est alors clos sans
      -- partir ; le brouillon reste validable et la personne l'envoie elle-même.
      execute 'select statut, verrou, motif from public.envois where id = $1' into v_estatut, v_everrou, v_emotif using v_envoi;
      if v_estatut = 'bloque' then
        update public.filed_reponses set statut = 'non_reglee',
               motif = left(format('Le courriel ne peut pas partir (%s%s) : le brouillon reste à valider, puis à envoyer par la personne.',
                                   coalesce(v_everrou, 'bloqué'), coalesce(' : ' || v_emotif, '')), 500)
         where id = v_id;
      end if;
    exception when others then
      v_err := left(sqlstate || ' ' || sqlerrm, 400);
      update public.filed_reponses set statut = 'non_reglee',
             motif = left('Le courriel n''a pas pu être préparé (' || v_err || ') : le brouillon reste à valider, puis à envoyer par la personne.', 500)
       where id = v_id;
    end;
  end if;
  perform private.filed_historiser(v_d.client_id, v_d.id, 'filed_document', v_d.id::text, 'reponse_preparee',
    format('Réponse au fournisseur rédigée (%s) : « %s ». Elle attend la validation d''une personne.', replace(p_sorte, '_', ' '), v_sujet),
    jsonb_build_object('reponse', v_id, 'demande', v_dem, 'envoi', v_envoi));
  perform private.filed_journaliser(v_d.client_id, 'filed.reponse.preparee', 'filed_document', v_d.id::text,
    jsonb_build_object('reponse', v_id, 'sorte', p_sorte, 'demande', v_dem, 'envoi', v_envoi), v_d.entite_id);
  return v_id;
end $$;
revoke all on function private.filed_preparer_reponse(uuid, text, text, text, text, text) from public, anon;
grant execute on function private.filed_preparer_reponse(uuid, text, text, text, text, text) to authenticated, service_role;

create or replace function public.filed_preparer_reponse(p_document uuid, p_sorte text, p_motif text default null, p_adresse text default null,
                                                        p_sujet text default null, p_corps text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_preparer_reponse(p_document, p_sorte, p_motif, p_adresse, p_sujet, p_corps) $$;
comment on function public.filed_preparer_reponse(uuid, text, text, text, text, text) is
  'Rédige une réponse au fournisseur (piece_manquante, contestation, confirmation) ou reprend le texte donné, et la dépose en validation : rien ne part sans l''accord d''une personne.';
revoke all on function public.filed_preparer_reponse(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.filed_preparer_reponse(uuid, text, text, text, text, text) to authenticated, service_role;

-- La décision sur une réponse (appelée par filed_executer_decision). Le courriel suit la demande (socle) : approuvée,
-- il part ; refusée, expirée ou annulée, il ne part pas.
create or replace function private.filed_decider_reponse(p_d public.demandes_validation, p_decideur uuid, p_commentaire text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_r public.filed_reponses;
begin
  select * into v_r from public.filed_reponses where id = (p_d.payload ->> 'reponse')::uuid for update;
  if not found then return 'reponse_effacee'; end if;
  if v_r.statut not in ('a_valider', 'non_reglee') then return 'deja_traitee'; end if;
  if p_d.statut = 'approuvee' and p_d.politique_id is not null then
    -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
    update public.demandes_validation set statut = 'echec_execution',
           motif_echec = 'Une réponse à un fournisseur n''est jamais validée d''office par un accord permanent.' where id = p_d.id;
    update public.filed_reponses set statut = 'bloquee', motif = 'Approuvée par un accord permanent : refusé, une personne doit valider.' where id = v_r.id;
    return 'refuse_accord';
  end if;
  if p_d.statut = 'approuvee' then
    update public.filed_reponses set statut = 'validee', decide_par = p_decideur, decide_le = now(),
           motif = coalesce(motif, case when envoi_id is null then null end) where id = v_r.id;
    update public.demandes_validation set statut = 'executee' where id = p_d.id;
    perform private.filed_historiser(v_r.client_id, v_r.document_id, 'filed_document', v_r.document_id::text, 'reponse_validee',
      case when v_r.envoi_id is null then format('Réponse « %s » validée par une personne ; à envoyer par elle (courriel non réglé).', v_r.sujet)
           else format('Réponse « %s » validée par une personne ; le courriel part.', v_r.sujet) end,
      jsonb_build_object('reponse', v_r.id, 'demande', p_d.id, 'par', p_decideur));
    return 'reponse_validee';
  elsif p_d.statut = 'rejetee' then
    update public.filed_reponses set statut = 'refusee', decide_par = p_decideur, decide_le = now(),
           motif = left(coalesce(p_commentaire, 'Refusée par une personne.'), 500) where id = v_r.id;
    perform private.filed_historiser(v_r.client_id, v_r.document_id, 'filed_document', v_r.document_id::text, 'reponse_refusee',
      format('Réponse « %s » refusée : rien n''est parti.', v_r.sujet), jsonb_build_object('reponse', v_r.id, 'demande', p_d.id));
    return 'reponse_refusee';
  end if;
  update public.filed_reponses set statut = 'expiree', decide_le = now() where id = v_r.id;
  return 'expiree';
end $$;
revoke all on function private.filed_decider_reponse(public.demandes_validation, uuid, text) from public, anon, authenticated;

-- filed_executer_decision (texte d'a4_08) : la branche filed.repondre.
CREATE OR REPLACE FUNCTION private.filed_executer_decision(p_charge jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_decideur uuid;
  v_commentaire text;
  v_four public.filed_fournisseurs;
  v_ib public.filed_fournisseurs_ibans;
  r record;
  v_issue text;
begin
  if coalesce(p_charge ->> 'demande', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'sans_demande';
  end if;
  select * into v_d from public.demandes_validation where id = (p_charge ->> 'demande')::uuid for update;
  if not found then
    return 'demande_effacee';
  end if;
  if v_d.module <> 'filed' then
    return 'autre_module';
  end if;
  if v_d.statut not in ('approuvee', 'rejetee', 'expiree') then
    return 'deja_traitee';
  end if;
  select a.user_id, a.commentaire into v_decideur, v_commentaire from public.approbations a
  where a.demande_id = v_d.id order by a.decide_le desc limit 1;

  if v_d.type_action = 'filed.valider_fournisseur' then
    select * into v_four from public.filed_fournisseurs
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'fournisseur_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un fournisseur nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_four.statut = 'a_confirmer' then
        update public.filed_fournisseurs set statut = 'actif', confirme_le = now(), confirme_par = v_decideur, maj_le = now()
        where id = v_four.id;
        -- L'IBAN que la personne a vu dans la demande se valide avec le fournisseur.
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where fournisseur_id = v_four.id and statut = 'propose'
          and empreinte = v_d.payload ->> 'iban_empreinte';
        -- Un autre IBAN proposé entre-temps part, lui, à la file.
        for r in select i.id, i.iban_masque from public.filed_fournisseurs_ibans i
                 where i.fournisseur_id = v_four.id and i.statut = 'propose'
        loop
          perform private.filed_deposer_demande(v_four.client_id, null, 'filed.valider_iban', 'filed_iban', r.id::text,
            format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), r.iban_masque), null,
            jsonb_build_object('fournisseur', v_four.id, 'iban', r.iban_masque), 'filed:iban:' || r.id::text);
        end loop;
        perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'confirme',
          'Fournisseur confirmé par une personne.', jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_confirme';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs set statut = 'refuse', motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500),
             confirme_le = now(), confirme_par = v_decideur, maj_le = now()
      where id = v_four.id;
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = 'Refusé avec le fournisseur.'
      where fournisseur_id = v_four.id and statut = 'propose';
      perform private.lever_alerte_module(v_four.client_id, 'filed', 'critique',
        left(format('Fournisseur refusé : %s. Ses factures restent bloquées.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'demande', v_d.id), 'fournisseur_refuse:' || v_four.id::text, true, null);
      perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'refuse',
        'Fournisseur refusé par une personne' || coalesce(' : ' || v_commentaire, '.'), jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_refuse';
    end if;
    return 'expiree';
  end if;

  if v_d.type_action = 'filed.valider_iban' then
    select * into v_ib from public.filed_fournisseurs_ibans
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'iban_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un IBAN nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_ib.statut = 'propose' then
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where id = v_ib.id;
        perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_valide',
          format('IBAN %s validé par une personne.', v_ib.iban_masque), jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_valide';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500)
      where id = v_ib.id;
      select * into v_four from public.filed_fournisseurs where id = v_ib.fournisseur_id;
      perform private.lever_alerte_module(v_ib.client_id, 'filed', 'critique',
        left(format('Changement d''IBAN refusé pour %s : tentative de fraude possible.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'iban', v_ib.iban_masque, 'demande', v_d.id),
        'iban_refuse:' || v_ib.id::text, true, null);
      perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_refuse',
        format('IBAN %s refusé par une personne', v_ib.iban_masque) || coalesce(' : ' || v_commentaire, '.'),
        jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_refuse';
    end if;
    return 'expiree';
  end if;

  -- Lot 4 (A4) : la facture (filed.valider_facture[.<centre>][.direction]) et l'imputation proposée (filed.imputer).
  if v_d.type_action like 'filed.valider_facture%' then
    return private.filed_decider_facture(v_d, v_decideur, v_commentaire);
  end if;
  if v_d.type_action = 'filed.imputer' then
    if v_d.statut = 'expiree' then
      return 'expiree';
    end if;
    v_issue := private.filed_decider_imputation(v_d);
    if v_d.statut = 'approuvee' then
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
    end if;
    return v_issue;
  end if;

  -- Lot 30 (a4_38) : la réponse au fournisseur, validée par une personne.
  if v_d.type_action = 'filed.repondre' then
    return private.filed_decider_reponse(v_d, v_decideur, v_commentaire);
  end if;

  return 'type_inconnu';
end $function$;


-- ═══ omega/modules/reput/migrations/c3_14_pieces_jointes.sql @ 81fae43c
-- c3_14 — REPUT : lire et afficher les pièces jointes d'une demande (session C3, 19/10/2026)
--
-- Chiffrage #43 (« Les pièces jointes sont conservées et rattachées à la demande ») : A2 garde les pièces sur la réception
-- (public.receptions.pieces = [{nom, mime, taille, chemin}], fichiers dans le bucket omega-clients sous
-- <client>/receptions/<id externe>/<nom>). L'écran n'en montrait que les noms. Ce lot ouvre la pièce depuis la demande :
--   · public.reput_pieces(p_demande) — la liste des pièces de la demande, rangée, avec leur nature (image, pdf, texte,
--     audio, vidéo, autre) et si l'écran peut l'afficher dans la page ; les pièces non reçues (detail.pieces_ignorees)
--     sont dites ;
--   · public.reput_ouvrir_piece(p_demande, p_rang) — rend le chemin à signer (URL de 5 minutes, côté écran) et journalise
--     l'ouverture (reput.piece.ouverte : rang, nature, taille ; jamais le nom du fichier ni son contenu).
-- Qui : une personne connectée qui lit la demande (même règle que la politique de lecture de reput_demandes : membre de
-- l'organisation et périmètre couvrant l'entité). Un chemin qui ne commence pas par le client de la demande n'est jamais
-- rendu. Affichées dans la page : images courantes, PDF, texte brut ; le reste (SVG et HTML compris) se télécharge.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_nature_piece(p_mime text, p_nom text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when lower(coalesce(p_mime, '')) in ('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif')
      or lower(coalesce(p_nom, '')) ~ '\.(jpe?g|png|gif|webp|heic|heif)$' then 'image'
    when lower(coalesce(p_mime, '')) = 'application/pdf' or lower(coalesce(p_nom, '')) ~ '\.pdf$' then 'pdf'
    when lower(coalesce(p_mime, '')) = 'text/plain' or lower(coalesce(p_nom, '')) ~ '\.txt$' then 'texte'
    when lower(coalesce(p_mime, '')) like 'audio/%' then 'audio'
    when lower(coalesce(p_mime, '')) like 'video/%' then 'video'
    else 'autre'
  end
$function$;

revoke execute on function private.reput_nature_piece(text, text) from public, anon, authenticated;

-- La demande, si la personne connectée la lit ; sinon une erreur 42501.
create or replace function private.reput_demande_lue(p_demande uuid)
 returns public.reput_demandes
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  d public.reput_demandes;
begin
  select * into d from public.reput_demandes x where x.id = p_demande;
  if v_uid is null or d.id is null or d.client_id not in (select private.mes_clients())
     or not private.perimetre_couvre(v_uid, d.client_id, d.entite_id) then
    raise exception 'Cette demande n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  return d;
end $function$;

revoke execute on function private.reput_demande_lue(uuid) from public, anon, authenticated;

create or replace function private.reput_pieces_liste(d public.reput_demandes)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'rang', x.rang,
           'nom', coalesce(nullif(btrim(x.p ->> 'nom'), ''), 'pièce ' || x.rang),
           'mime', coalesce(x.p ->> 'mime', 'application/octet-stream'),
           'taille', case when (x.p ->> 'taille') ~ '^[0-9]{1,15}$' then (x.p ->> 'taille')::bigint end,
           'nature', private.reput_nature_piece(x.p ->> 'mime', x.p ->> 'nom'),
           'affichable', private.reput_nature_piece(x.p ->> 'mime', x.p ->> 'nom') in ('image', 'pdf', 'texte'),
           'disponible', coalesce(x.p ->> 'chemin', '') like d.client_id::text || '/%')
         order by x.rang), '[]'::jsonb)
  from public.receptions r,
       lateral jsonb_array_elements(case when jsonb_typeof(r.pieces) = 'array' then r.pieces else '[]'::jsonb end)
         with ordinality as x(p, rang)
  where r.id = d.reception_id and r.client_id = d.client_id
$function$;

revoke execute on function private.reput_pieces_liste(public.reput_demandes) from public, anon, authenticated;

create or replace function public.reput_pieces(p_demande uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_lue(p_demande);
  v_ignorees jsonb;
begin
  select case when jsonb_typeof(r.detail -> 'pieces_ignorees') = 'array' then r.detail -> 'pieces_ignorees' else '[]'::jsonb end
    into v_ignorees
  from public.receptions r where r.id = d.reception_id and r.client_id = d.client_id;
  return jsonb_build_object('demande', d.id, 'pieces', private.reput_pieces_liste(d), 'ignorees', coalesce(v_ignorees, '[]'::jsonb));
end $function$;

revoke execute on function public.reput_pieces(uuid) from public, anon;
grant execute on function public.reput_pieces(uuid) to authenticated, service_role;

create or replace function public.reput_ouvrir_piece(p_demande uuid, p_rang integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_lue(p_demande);
  p jsonb;
  v_chemin text;
  v_nature text;
begin
  select x.p into p
  from public.receptions r,
       lateral jsonb_array_elements(case when jsonb_typeof(r.pieces) = 'array' then r.pieces else '[]'::jsonb end)
         with ordinality as x(p, rang)
  where r.id = d.reception_id and r.client_id = d.client_id and x.rang = p_rang;
  if p is null then
    raise exception 'Cette demande n''a pas de pièce n° %.', p_rang using errcode = '22023';
  end if;
  v_chemin := p ->> 'chemin';
  if v_chemin is null or v_chemin not like d.client_id::text || '/%' or v_chemin ~ '(^|/)\.\.(/|$)' then
    raise exception 'Cette pièce n''est pas dans le stockage de l''organisation.' using errcode = '22023';
  end if;
  v_nature := private.reput_nature_piece(p ->> 'mime', p ->> 'nom');
  perform private.journaliser_module(d.client_id, 'reput', 'reput.piece.ouverte', 'reput_demandes', d.id::text,
    jsonb_build_object('rang', p_rang, 'nature', v_nature, 'taille', p -> 'taille', 'par', (select auth.uid())), d.entite_id);
  return jsonb_build_object('bucket', 'omega-clients', 'chemin', v_chemin, 'duree', 300,
                            'nom', coalesce(nullif(btrim(p ->> 'nom'), ''), 'pièce ' || p_rang),
                            'mime', coalesce(p ->> 'mime', 'application/octet-stream'), 'nature', v_nature,
                            'affichable', v_nature in ('image', 'pdf', 'texte'));
end $function$;

revoke execute on function public.reput_ouvrir_piece(uuid, integer) from public, anon;
grant execute on function public.reput_ouvrir_piece(uuid, integer) to authenticated, service_role;
