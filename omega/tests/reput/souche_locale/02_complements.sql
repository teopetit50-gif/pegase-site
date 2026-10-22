-- 02_complements.sql — SOUCHE LOCALE : ce que REPUT appelle du socle et que la souche de B4 n'a pas.
-- Comportements IMITÉS (pas copiés) à partir de omega/SOCLE-EXTRAITS-COMMUN.sql. Jamais sur la recette.
alter table public.comptes_entites add column if not exists cree_le timestamptz default now();
-- journaliser_module à sept arguments (l'entité), comme le socle.
create or replace function private.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text,
                                                      p_donnees jsonb, p_entite uuid) returns bigint
language plpgsql security definer set search_path to '' as $$
declare v_avant text := current_setting('omega.module', true); v_id bigint;
begin
  if p_action !~ ('^' || p_module || '\.[a-z][a-z0-9_.]{1,79}$') then
    raise exception 'Une action de module commence par son nom : « %.… ».', p_module using errcode = '22023';
  end if;
  perform set_config('omega.module', p_module, true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', coalesce(v_avant, ''), true);
  return v_id;
end $$;

-- ── Réceptions (A2, lot 18) ──
create table if not exists public.receptions (
  id bigserial primary key, client_id uuid not null references public.clients(id) on delete cascade, entite_id uuid, module text,
  canal text not null check (canal in ('email', 'whatsapp', 'sms', 'formulaire')), boite text not null, identifiant_externe text not null,
  de_adresse text, de_empreinte text, de_nom text, sujet text, corps text, corps_html text, pieces jsonb not null default '[]',
  detail jsonb not null default '{}', en_reponse_a uuid, fil text, langue text,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'lue', 'traitee', 'ignoree', 'indesirable')),
  traite_par uuid, recu_le timestamptz not null default now(), cree_le timestamptz not null default now(), maj_le timestamptz not null default now(),
  unique (client_id, canal, identifiant_externe));

-- ── Envois (lot 17), réduits à ce que REPUT lit ; préparation imitée : a_valider, validé si la décision l'est ──
create table if not exists public.envois (
  id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null, objet_type text, objet_id text,
  canal text not null check (canal in ('email', 'whatsapp', 'sms', 'lre', 'appel')), destinataire_adresse text, destinataire_nom text,
  destinataire_langue text not null default 'fr', sujet text, corps text not null, transactionnel boolean not null, donnees_sante boolean not null,
  demande_id uuid references public.demandes_validation(id) on delete set null, adossee boolean not null default false, mode text not null default 'essai',
  statut text not null default 'a_valider', verrou text, motif text, echeance timestamptz not null default now() + interval '7 days',
  cle_idempotence text not null, envoye_le timestamptz, cree_le timestamptz not null default now(), unique (client_id, cle_idempotence));
create table if not exists private.souche_verrous (adresse text primary key, code text not null, motif text);

create table if not exists public.gabarits_messages (
  id uuid primary key default gen_random_uuid(), client_id uuid, module text not null, code text not null, langue text not null,
  version integer not null, canal text not null, libelle text, sujet text, corps text not null, variables jsonb not null default '{}',
  transactionnel boolean not null default true, donnees_sante boolean not null default false, espacement boolean not null default false,
  statut text not null default 'brouillon', note text, unique nulls not distinct (client_id, code, langue, version));
create or replace function private.preparer_envoi(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text, p_destinataire jsonb,
  p_gabarit text default null, p_variables jsonb default '{}', p_sujet text default null, p_corps text default null, p_pieces uuid[] default null,
  p_cle_idempotence text default null, p_entite uuid default null, p_transactionnel boolean default false, p_donnees_sante boolean default false,
  p_echeance timestamptz default null, p_options jsonb default '{}') returns uuid
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_d public.demandes_validation; v_v private.souche_verrous; g public.gabarits_messages; k text; v text;
begin
  select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = p_cle_idempotence;
  if v_id is not null then return v_id; end if;
  -- Gabarit (socle 17) imité : un gabarit validé de l'organisation (ou commun), même canal ; {{variable}} remplacées.
  if p_gabarit is not null then
    if p_sujet is not null or p_corps is not null then raise exception 'Un gabarit ou un texte (sujet, corps), pas les deux.' using errcode = '22023'; end if;
    select * into g from public.gabarits_messages x where x.code = p_gabarit and x.module = p_module and x.statut = 'valide'
      and (x.client_id = p_client or x.client_id is null) and x.langue = coalesce(p_destinataire ->> 'langue', 'fr')
    order by x.client_id nulls last, x.version desc limit 1;
    if g.id is null then raise exception 'Aucun gabarit validé « % » pour le module %.', p_gabarit, p_module using errcode = 'P0002'; end if;
    if g.canal <> p_canal then raise exception 'Le gabarit % est écrit pour le canal %, pas pour %.', p_gabarit, g.canal, p_canal using errcode = '22023'; end if;
    p_corps := g.corps;
    -- organisation et entite sont fournies par la base (socle), jamais passées.
    p_corps := replace(p_corps, '{{organisation}}', coalesce((select c.nom from public.clients c where c.id = p_client), ''));
    for k, v in select * from jsonb_each_text(coalesce(p_variables, '{}')) loop p_corps := replace(p_corps, '{{' || k || '}}', v); end loop;
  elsif p_variables is not null and p_variables <> '{}'::jsonb then
    raise exception 'Des variables sans gabarit : rien à remplir.' using errcode = '22023';
  end if;
  if p_canal = 'email' and p_sujet is null then raise exception 'Un envoi par courriel porte un sujet.' using errcode = '22023'; end if;
  if p_canal <> 'email' and p_sujet is not null then raise exception 'Un envoi par % n''a pas de sujet.', p_canal using errcode = '22023'; end if;
  if p_canal = 'sms' and char_length(p_corps) > 640 then raise exception 'Message trop long pour le canal SMS.' using errcode = '22023'; end if;
  select * into v_d from public.demandes_validation d where d.id = (p_options ->> 'demande')::uuid;
  if v_d.id is null or v_d.module <> p_module or v_d.objet_type is distinct from p_objet_type or v_d.objet_id is distinct from p_objet_id then
    raise exception 'Cette décision ne porte pas sur cet envoi : même module, même objet.' using errcode = '22023';
  end if;
  insert into public.envois (client_id, entite_id, module, objet_type, objet_id, canal, destinataire_adresse, destinataire_nom, destinataire_langue,
    sujet, corps, transactionnel, donnees_sante, demande_id, adossee, cle_idempotence, gabarit_id, variables)
  values (p_client, p_entite, p_module, p_objet_type, p_objet_id, p_canal, p_destinataire ->> 'adresse', p_destinataire ->> 'nom',
    coalesce(p_destinataire ->> 'langue', 'fr'), p_sujet, p_corps, p_transactionnel, p_donnees_sante, v_d.id, true, p_cle_idempotence,
    g.id, coalesce(p_variables, '{}'))
  returning id into v_id;
  select * into v_v from private.souche_verrous s where s.adresse = p_destinataire ->> 'adresse';
  if v_v.code is not null then
    update public.envois set statut = 'bloque', verrou = v_v.code, motif = v_v.motif where id = v_id;
  elsif v_d.statut = 'approuvee' then
    update public.envois set statut = 'pret' where id = v_id;
  end if;
  return v_id;
end $$;
create or replace function private.souche_suivre_demande() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.statut = 'approuvee' then update public.envois set statut = 'pret' where demande_id = new.id and statut = 'a_valider';
  elsif new.statut in ('rejetee', 'expiree', 'annulee') then update public.envois set statut = 'annule' where demande_id = new.id and statut = 'a_valider'; end if;
  return null;
end $$;
drop trigger if exists demandes_validation_envois on public.demandes_validation;
create trigger demandes_validation_envois after update of statut on public.demandes_validation for each row execute function private.souche_suivre_demande();

-- ── pg_cron imité ──
create schema if not exists cron;
create table if not exists cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create or replace function cron.schedule(p_nom text, p_quand text, p_commande text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (p_nom, p_quand, p_commande) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create table if not exists public.reglages_envois (id uuid primary key default gen_random_uuid(), client_id uuid not null, module text,
  mode text not null default 'essai', essai_adresse text, canaux text[]);
-- Droits du socle sur la file (comme la recette) : authenticated décide en son nom, lit les demandes.
grant select, insert on public.approbations to authenticated;
grant select on public.demandes_validation to authenticated;

-- ── Accords permanents (public.politiques, lot 16) imités : proposer → demande politique.activer → active ──
create table if not exists public.politiques (
  id uuid primary key default gen_random_uuid(), client_id uuid not null, entite_id uuid, module text not null, type_action text not null,
  libelle text not null, plafond_operation numeric, plafond_mensuel numeric, nombre_mensuel integer, debut timestamptz not null default now(),
  fin timestamptz not null, fuseau text not null default 'Europe/Paris', statut text not null default 'a_valider'
  check (statut in ('a_valider', 'active', 'refusee', 'revoquee')), demande_id uuid, cree_par uuid, cree_le timestamptz not null default now(),
  active_le timestamptz, revoquee_le timestamptz, revoquee_par uuid, motif_revocation text,
  check (plafond_operation is not null or nombre_mensuel is not null));
grant select, insert on public.politiques to authenticated;
create or replace function private.souche_preparer_politique() returns trigger language plpgsql security definer set search_path to '' as $$
begin new.statut := 'a_valider'; new.cree_par := (select auth.uid()); new.cree_le := now(); return new; end $$;
create or replace function private.souche_deposer_activation() returns trigger language plpgsql security definer set search_path to '' as $$
declare v uuid;
begin
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, cle_idempotence)
  values (new.client_id, new.entite_id, new.module, 'politique.activer', 'politique', new.id::text, left('Accord permanent : ' || new.libelle, 500), 'politique:' || new.id)
  returning id into v;
  update public.politiques set demande_id = v where id = new.id;
  return null;
end $$;
create or replace function private.souche_suivre_activation() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.type_action = 'politique.activer' and new.statut = 'approuvee' and old.statut = 'en_attente' then
    update public.politiques set statut = 'active', active_le = now() where id = new.objet_id::uuid and statut = 'a_valider';
  end if;
  return null;
end $$;
create trigger politiques_preparer before insert on public.politiques for each row execute function private.souche_preparer_politique();
create trigger politiques_deposer_activation after insert on public.politiques for each row execute function private.souche_deposer_activation();
create trigger demandes_validation_suivre_activation after update of statut on public.demandes_validation for each row execute function private.souche_suivre_activation();
create or replace function private.politique_couvrante(p_client uuid, p_module text, p_type text, p_entite uuid, p_montant numeric, p_quand timestamptz)
returns uuid language sql stable security definer set search_path to '' as $$
  select p.id from public.politiques p
  where p.client_id = p_client and p.module = p_module and p.type_action = p_type and p.statut = 'active'
    and (p.entite_id is null or p.entite_id = p_entite) and p_quand >= p.debut and p_quand < p.fin
    and (p.nombre_mensuel is null or (select count(*) from public.demandes_validation d where d.politique_id = p.id) < p.nombre_mensuel)
  order by p.entite_id nulls last limit 1 $$;
create or replace function private.revoquer_politique(p_id uuid, p_motif text) returns void language sql security definer set search_path to '' as $$
  update public.politiques set statut = 'revoquee', revoquee_le = now(), revoquee_par = (select auth.uid()), motif_revocation = p_motif where id = p_id $$;
-- 19af imité : le gérant seul décideur approuve sa propre demande d'activation.
create or replace function private.preparer_approbation() returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_d public.demandes_validation; v_uid uuid := (select auth.uid());
begin
  select * into v_d from public.demandes_validation where id = new.demande_id;
  if not found then raise exception 'Demande introuvable.' using errcode = 'P0002'; end if;
  if v_d.statut <> 'en_attente' then raise exception 'Cette demande n''attend plus de décision (%).', v_d.statut using errcode = '55000'; end if;
  new.user_id := coalesce(new.user_id, v_uid);
  if new.user_id is null then raise exception 'Une décision vient d''une personne.' using errcode = '42501'; end if;
  new.client_id := v_d.client_id;
  if v_d.demandeur_id is not null and v_d.demandeur_id = new.user_id then
    if not (v_d.type_action = 'politique.activer' and private.reput_seul_decideur(v_d.client_id, new.user_id)) then
      raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
    end if;
    new.commentaire := left('[seul décideur] ' || coalesce(new.commentaire, ''), 2000);
  end if;
  perform private.exiger_decideur(v_d, coalesce(new.au_nom_de, new.user_id));
  new.decide_le := now();
  return new;
end $function$;

-- ── Points du matin : la souche commune (01_socle, B4) porte points_sections et points_items. Sa deposer_section
--    refuse toute ligne qui désigne un objet, « le pire cas » ; le vrai socle ne refuse le texte libre que sur un objet
--    CHIFFRÉ (private.objets_chiffres, lot 14b), et reput_demandes n'en est pas un. On rend ici la règle réelle :
--    objet_type et objet_id vont ensemble, et l'objet n'est pas chiffré. ──
create table if not exists private.objets_chiffres (objet_type text primary key);
create or replace function private.deposer_section(p_client uuid, p_module text, p_jour date, p_destinataire uuid, p_role text, p_titre text, p_items jsonb,
  p_entite uuid default null, p_equipe uuid default null, p_sante boolean default false, p_donnees_du timestamptz default null,
  p_incomplete boolean default false, p_ordre integer default 100) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  if num_nonnulls(p_destinataire, p_role, p_equipe) <> 1 then raise exception 'un seul destinataire' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) e
             where (e ? 'objet_type') <> (e ? 'objet_id')
                or (e ? 'objet_type' and exists (select 1 from private.objets_chiffres oc where oc.objet_type = e ->> 'objet_type'))
                or coalesce(e ->> 'gravite', '') not in ('info', 'attention', 'critique')
                or left(e ->> 'lien', 1) <> '/' or char_length(e ->> 'texte') > 300) then
    raise exception 'ligne refusée par la souche' using errcode = '22023';
  end if;
  insert into public.points_sections (client_id, module, jour, destinataire, role, titre, ordre, nb_items)
  values (p_client, p_module, p_jour, p_destinataire, p_role, p_titre, p_ordre, jsonb_array_length(p_items))
  on conflict (client_id, module, jour, destinataire, role, titre) do update set nb_items = excluded.nb_items, maj_le = now()
  returning id into v_id;
  delete from public.points_items where section_id = v_id;
  insert into public.points_items (client_id, section_id, rang, texte, lien, gravite, objet_type, objet_id)
  select p_client, v_id, x.n, x.e ->> 'texte', x.e ->> 'lien', x.e ->> 'gravite', x.e ->> 'objet_type', x.e ->> 'objet_id'
  from jsonb_array_elements(p_items) with ordinality x(e, n);
  return v_id;
end $$;
create or replace function private.battre_ouvrier(p_module text, p_genres text[], p_detail jsonb, p_attendu interval default '15 minutes')
returns integer language sql as $$ select 0 $$;
create or replace function private.echouer_travail(p_id bigint, p_err text, p_reprendre boolean) returns text language sql as $$
  update public.travaux set etat = 'echec', erreur = p_err where id = p_id returning 'echec' $$;

-- ── La remise par l'ouvrier d'envoi (lot 17) imitée : commencer (pret → en_cours), confirmer (en_cours → envoye) ──
create or replace function private.commencer_envoi(p_envoi uuid) returns jsonb language plpgsql security definer set search_path to '' as $$
declare e public.envois;
begin
  if (select auth.uid()) is not null then raise exception 'Réservé à l''ouvrier d''envoi (le serveur).' using errcode = '42501'; end if;
  update public.envois set statut = 'en_cours' where id = p_envoi and statut = 'pret' returning * into e;
  if e.id is null then return jsonb_build_object('envoyer', false, 'statut', (select x.statut from public.envois x where x.id = p_envoi)); end if;
  return jsonb_build_object('envoyer', true, 'mode', 'essai');
end $$;
create or replace function private.confirmer_envoi(p_envoi uuid, p_reference text default null) returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.envois set statut = 'envoye', envoye_le = now() where id = p_envoi and statut = 'en_cours';
  if not found then raise exception 'Envoi introuvable, ou pas en cours d''envoi.' using errcode = 'P0002'; end if;
end $$;
create or replace function extensions.digest(text, text) returns bytea language sql immutable as $$ select public.digest($1, $2) $$;
create or replace function private.publier_evenement(p_client uuid, p_evenement text, p_charge jsonb default '{}', p_cle text default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; n integer := 0;
begin
  for r in select a.module, a.genre from private.abonnements a where a.evenement = p_evenement loop
    perform private.deposer_travail(p_client, r.module, r.genre, coalesce(p_charge, '{}') || jsonb_build_object('evenement', p_evenement),
                                    case when p_cle is null then null else p_evenement || ':' || p_cle end, 0::smallint);
    n := n + 1;
  end loop;
  return n;
end $$;
alter table public.equipes_membres add column if not exists client_id uuid;
alter table public.equipes add column if not exists cle text;

-- ── Gabarits et envoi interne (socle 19as, A1), imités : un membre, un gabarit validé fermé, sans validation ──

alter table public.envois add column if not exists destinataire_membre uuid;
alter table public.envois add column if not exists gabarit_id uuid;
alter table public.envois add column if not exists variables jsonb not null default '{}';
alter table public.gabarits_messages add column if not exists modele_externe text;
alter table public.envois add column if not exists direct boolean not null default false;
create or replace function public.valider_gabarit(p_gabarit uuid, p_note text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if current_user <> 'service_role' and current_user <> 'postgres' then
    raise exception 'Un gabarit se valide par le serveur.' using errcode = '42501';
  end if;
  update public.gabarits_messages set statut = 'valide', note = p_note where id = p_gabarit and statut = 'brouillon';
end $$;
grant execute on function public.valider_gabarit(uuid, text) to service_role;
create or replace function private.envoyer_interne(p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_canal text,
  p_membre uuid, p_gabarit text, p_variables jsonb default '{}', p_cle_idempotence text default null, p_entite uuid default null) returns uuid
language plpgsql security definer set search_path to '' as $$
declare v_id uuid; g public.gabarits_messages; v_corps text; v_sujet text; k text; v text;
begin
  select e.id into v_id from public.envois e where e.client_id = p_client and e.cle_idempotence = p_cle_idempotence;
  if v_id is not null then return v_id; end if;
  if (p_objet_type is null) <> (p_objet_id is null) then
    raise exception 'Un objet se désigne par son type et son identifiant.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_membre) then
    raise exception 'Le destinataire n''est pas membre de l''organisation.' using errcode = '23503';
  end if;
  select * into g from public.gabarits_messages x where x.code = p_gabarit and x.module = p_module and x.statut = 'valide'
    and (x.client_id = p_client or x.client_id is null) order by x.client_id nulls last, x.version desc limit 1;
  if g.id is null then raise exception 'Aucun gabarit validé « % ».', p_gabarit using errcode = 'P0002'; end if;
  if exists (select 1 from jsonb_each_text(g.variables) w where w.value = 'texte') then
    raise exception 'Gabarit non fermé.' using errcode = '22023';
  end if;
  v_sujet := g.sujet; v_corps := g.corps;
  for k, v in select * from jsonb_each_text(coalesce(p_variables, '{}') || jsonb_build_object('organisation', (select c.nom from public.clients c where c.id = p_client))) loop
    v_sujet := replace(v_sujet, '{{' || k || '}}', v); v_corps := replace(v_corps, '{{' || k || '}}', v);
  end loop;
  insert into public.envois (client_id, entite_id, module, objet_type, objet_id, canal, sujet, corps, transactionnel, donnees_sante,
    statut, cle_idempotence, destinataire_membre, direct)
  values (p_client, p_entite, p_module, p_objet_type, p_objet_id, p_canal, v_sujet, v_corps, true, false, 'pret', p_cle_idempotence, p_membre, true)
  returning id into v_id;
  return v_id;
end $$;

-- ── Entités lisibles au périmètre (socle : grant SELECT + politique « membres lisent les entites de leur perimetre ») ──
create or replace function private.voit_entite(p_client uuid, p_entite uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.client_id = p_client
                 and (c.perimetre_total or exists (select 1 from public.comptes_entites ce
                                                   where ce.user_id = c.user_id and ce.client_id = p_client and ce.entite_id = p_entite)))
$$;
alter table public.entites enable row level security;
grant select on public.entites to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entites' and policyname = 'membres lisent les entites de leur perimetre') then
    create policy "membres lisent les entites de leur perimetre" on public.entites for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, id));
  end if;
end $$;

-- ── Pour c3_23a (dépôt d'une réception) : la garde d'ouvrier et la résolution de boîte, imitées ──
create or replace function private.exiger_ouvrier() returns void language plpgsql stable security definer set search_path to '' as $$
begin
  if not private.reput_est_serveur() then raise exception 'Réservé aux ouvriers d''Omega.' using errcode = '42501'; end if;
end $$;
create or replace function private.resoudre_boite(p_canal text, p_boite text) returns jsonb language sql stable security definer set search_path to '' as $$
  select null::jsonb
$$;

-- private.preparer_gabarit (socle) imité pour la règle que REPUT touche : organisation et entite ne se déclarent pas.
create or replace function private.souche_preparer_gabarit() returns trigger language plpgsql set search_path to '' as $$
begin
  if new.variables ?| array['organisation', 'entite'] then
    raise exception 'Nom de variable refusé : « % » (organisation et entite sont fournies par la base)',
      (select k from jsonb_object_keys(new.variables) k where k in ('organisation', 'entite') limit 1) using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists gabarits_messages_preparer on public.gabarits_messages;
create trigger gabarits_messages_preparer before insert or update on public.gabarits_messages for each row execute function private.souche_preparer_gabarit();

-- private.verrous_envoi (socle 17) imité pour ce que c3_41a touche : la plage d'envoi (8 h – 20 h, Paris, tous les jours)
-- et le verrou HORS_HEURES, écrits avec la MÊME ligne que le socle (l'ancre que c3_41a modifie).
create or replace function private.verrous_envoi(p_e public.envois, p_complet boolean, p_instant timestamp with time zone default now())
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v_t2 timestamptz;
  v_h numeric := extract(hour from p_instant at time zone 'Europe/Paris');
begin
  if p_complet then
    v_t2 := case when v_h >= 8 and v_h < 20 then p_instant
                 else date_trunc('day', (p_instant at time zone 'Europe/Paris') + case when v_h >= 20 then interval '1 day' else interval '0' end)
                      at time zone 'Europe/Paris' + interval '8 hours' end;
    if v_t2 is null or v_t2 > p_instant then
      return jsonb_build_object('code', 'HORS_HEURES', 'motif', 'Hors des heures d''envoi du destinataire.', 'definitif', false, 'reprise_le', v_t2);
    end if;
  end if;
  return null;
end $function$;
