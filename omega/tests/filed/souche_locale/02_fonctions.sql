
-- ── Fonctions du socle : souches ──
create or replace function private.mes_clients() returns setof uuid language sql stable security definer set search_path to '' as $$
  select c.client_id from public.comptes c where c.user_id = (select auth.uid()) $$;
create or replace function private.perimetre_couvre(p_user uuid, p_client uuid, p_entite uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client and (c.perimetre_total or p_entite is null or exists (select 1 from public.comptes_entites ce where ce.user_id = p_user and ce.entite_id = p_entite))) $$;
create or replace function private.voit_objet(p_client uuid, p_type text, p_id text) returns boolean language sql stable as $$ select true $$;
create or replace function private.voit_objet_pour(p_user uuid, p_client uuid, p_type text, p_id text) returns boolean language sql stable as $$ select true $$;
create or replace function private.dans_equipe(p_user uuid, p_equipe uuid) returns boolean language sql stable security definer set search_path to '' as $$ select exists (select 1 from public.equipes_membres m where m.equipe_id = p_equipe and m.user_id = p_user) $$;
create or replace function private.politique_couvrante(p_client uuid, p_module text, p_type text, p_entite uuid, p_montant numeric, p_quand timestamptz) returns uuid language sql stable as $$ select null::uuid $$;
create or replace function private.acteur_courant(out acteur_type text, out acteur_id uuid, out acteur_libelle text) language sql stable as $$
  select case when auth.uid() is not null then 'utilisateur' else 'systeme' end, auth.uid(), case when auth.uid() is not null then 'membre' else coalesce(current_setting('omega.module', true), 'socle') end $$;
create or replace function private.journaliser(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb, p_entite uuid) returns bigint language plpgsql security definer set search_path to '' as $$
declare v_prec bytea; v_id bigint; v_a record;
begin
  select * into v_a from private.acteur_courant();
  select j.hash into v_prec from public.journal_opposable j where j.client_id = p_client order by j.id desc limit 1;
  insert into public.journal_opposable (client_id, entite_id, acteur_type, acteur_id, acteur_libelle, action, objet_type, objet_id, donnees, hash_precedent, hash)
  values (p_client, p_entite, v_a.acteur_type, v_a.acteur_id, v_a.acteur_libelle, p_action, p_objet_type, p_objet_id, p_donnees, v_prec,
          extensions.digest(coalesce(v_prec, ''::bytea) || convert_to(p_action || p_objet_type || p_objet_id || p_donnees::text, 'UTF8'), 'sha256'))
  returning id into v_id;
  return v_id;
end $$;
create or replace function private.lever_alerte(p_client uuid, p_interne boolean, p_niveau text, p_source text, p_titre text, p_detail jsonb default '{}', p_cle text default null) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  insert into public.alertes (client_id, interne, niveau, source, titre, detail, cle_regroupement) values (p_client, p_interne, p_niveau, p_source, p_titre, p_detail, p_cle)
  on conflict do nothing returning id into v_id; return v_id;
end $$;
create or replace function private.lever_alerte_module(p_client uuid, p_module text, p_niveau text, p_titre text, p_detail jsonb default '{}', p_cle text default null, p_pour_client boolean default false, p_destinataire uuid default null) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  if p_destinataire is not null and not exists (select 1 from public.comptes c where c.user_id = p_destinataire and c.client_id = p_client) then raise exception 'destinataire hors organisation'; end if;
  insert into public.alertes (client_id, interne, niveau, source, titre, detail, cle_regroupement, destinataire) values (p_client, not p_pour_client, p_niveau, p_module, p_titre, p_detail, p_module || ':' || p_cle, p_destinataire)
  on conflict do nothing returning id into v_id; return v_id;
end $$;
create or replace function private.publier_evenement(p_client uuid, p_evenement text, p_charge jsonb, p_cle text) returns int language plpgsql security definer set search_path to '' as $$
declare n int := 0; a record;
begin
  for a in select * from private.abonnements where evenement = p_evenement loop
    insert into public.travaux (client_id, module, genre, charge, cle) values (p_client, a.module, a.genre, p_charge, p_cle); n := n + 1;
  end loop; return n;
end $$;
create or replace function private.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb default '{}', p_cle text default null, p_priorite smallint default 0) returns bigint language plpgsql as $$
declare v bigint; begin insert into public.travaux (client_id, module, genre, charge, cle, priorite) values (p_client, p_module, p_genre, p_charge, p_cle, p_priorite) returning id into v; return v; end $$;
create or replace function private.prendre_travaux(p_genres text[], p_n int, p_bail interval, p_ouvrier text) returns setof public.travaux language sql as $$
  update public.travaux set statut = 'en_cours' where id in (select id from public.travaux where genre = any (p_genres) and statut = 'a_faire' order by id limit p_n) returning * $$;
create or replace function private.finir_travail(p_id bigint, p_issue jsonb) returns void language sql as $$ update public.travaux set statut = 'fait', issue = p_issue where id = p_id $$;
create or replace function private.echouer_travail(p_id bigint, p_err text) returns void language sql as $$ update public.travaux set statut = 'echec', erreur = p_err where id = p_id $$;
create or replace function private.battre(p_client uuid, p_moteur text, p_detail jsonb, p_x uuid) returns void language sql as $$
  insert into public.battements (client_id, module, dernier_le) values (p_client, p_moteur, now()) on conflict (client_id, module) do update set dernier_le = now() $$;
create or replace function private.regler_battement(p_client uuid, p_moteur text, p_tous_les interval, p_x uuid, p_fuseau text) returns void language sql as $$ select null::void $$;
create or replace function private.filed_integrer_piece(p_piece uuid) returns text language sql as $$ select 'souche' $$;
create or replace function private.filed_recontroler_fournisseur(p_f uuid) returns void language plpgsql security definer set search_path to '' as $$
declare r record; begin
  for r in select f.id from public.filed_factures f where f.fournisseur_id = p_f and f.statut in ('a_completer', 'bloquee', 'a_valider') loop
    perform private.filed_controler_facture(r.id);
  end loop;
end $$;
create or replace function private.filed_rapprocher_facture(p_facture uuid) returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_l public.filed_factures_lignes; v_c public.filed_commandes_lignes; v_r public.filed_reglages;
begin
  -- Souche : la commande citée dans refs (numéro) est retrouvée et posée, comme le socle ; puis chaque ligne de
  -- facture est rapprochée de la ligne de commande de même rang.
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.commande_id is null and v_f.refs ? 'commande' then
    update public.filed_factures set commande_id = (select c.id from public.filed_commandes c where c.client_id = v_f.client_id and c.numero = v_f.refs->>'commande' limit 1) where id = v_f.id returning commande_id into v_f.commande_id;
  end if;
  if v_f.commande_id is null then return; end if;
  v_r := private.filed_reglage(v_f.client_id, v_f.entite_id);
  for v_l in select * from public.filed_factures_lignes where facture_id = v_f.id order by rang loop
    select * into v_c from public.filed_commandes_lignes where commande_id = v_f.commande_id and rang = v_l.rang;
    if found then perform private.filed_rapprocher_ligne(v_f, v_l, v_c, 'rang', 1::smallint, v_r, false); end if;
  end loop;
end $$;
create or replace function private.filed_regime_territorial(p_client uuid, p_entite uuid) returns text language sql as $$ select 'metropole'::text $$;
create or replace function private.filed_pays_ue(p text) returns boolean language sql immutable as $$ select p in ('AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK') $$;
create or replace function private.filed_iban_valide(p text) returns boolean language sql immutable as $$ select p ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' $$;
create or replace function private.filed_masquer_iban(p text) returns text language sql immutable as $$ select left(p, 4) || '…' || right(p, 4) $$;
create or replace function private.filed_levable(p_code text) returns boolean language sql immutable as $$ select p_code not like 'lecture.%' $$;
create or replace function private.filed_libelle_fournisseur(p public.filed_fournisseurs) returns text language sql immutable as $$ select p.nom $$;
create or replace function private.filed_montant_texte(p numeric) returns text language sql immutable as $$ select replace(to_char(coalesce(p, 0), 'FM999G999G990D00'), '.', ',') || ' €' $$;
create or replace function private.filed_quantite_texte(p numeric) returns text language sql immutable as $$ select trim(trailing '.' from trim(trailing '0' from coalesce(p, 0)::text)) $$;
create or replace function private.filed_luhn(p text) returns boolean language plpgsql immutable as $$
declare s int := 0; d int; i int; n int := char_length(p);
begin
  if p !~ '^[0-9]+$' then return false; end if;
  for i in 1..n loop
    d := substr(p, n - i + 1, 1)::int;
    if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    s := s + d;
  end loop;
  return s % 10 = 0;
end $$;
create or replace function private.filed_siren_valide(p text) returns boolean language sql immutable as $$ select coalesce(p ~ '^[0-9]{9}$' and private.filed_luhn(p), false) $$;
create or replace function private.filed_tva_fr_valide(p text) returns boolean language plpgsql immutable as $$
declare v text := upper(regexp_replace(coalesce(p, ''), '[\s.\-]', '', 'g')); m text[];
begin
  m := regexp_match(v, '^FR([0-9A-Z]{2})([0-9]{9})$');
  if m is null or not private.filed_siren_valide(m[2]) then return false; end if;
  if m[1] ~ '^[0-9]{2}$' then return m[1]::int = (12 + 3 * (m[2]::bigint % 97)) % 97; end if;
  return true;
end $$;
create or replace function private.filed_reglage(p_client uuid, p_entite uuid) returns public.filed_reglages language sql stable set search_path to '' as $$
  select r.* from public.filed_reglages r where r.client_id = p_client and (r.entite_id = p_entite or r.entite_id is null) order by (r.entite_id is not null) desc limit 1 $$;
create or replace function private.filed_exiger_acteur(p_client uuid, p_roles text[], p_entite uuid default null) returns uuid language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
begin
  if v_uid is not null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.role = any (p_roles)) then raise exception 'Votre rôle ne permet pas ce geste dans FILED.' using errcode = '42501'; end if;
    if p_entite is not null and not private.perimetre_couvre(v_uid, p_client, p_entite) then raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501'; end if;
    return v_uid;
  end if;
  if v_role = 'service_role' then return null; end if;
  raise exception 'Seule une personne de l''organisation, ou le serveur, agit dans FILED.' using errcode = '42501';
end $$;
create or replace function private.filed_exiger_facture(p_facture uuid, p_roles text[]) returns public.filed_factures language plpgsql stable security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, p_roles, v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  if v_f.statut not in ('a_completer', 'bloquee', 'a_valider', 'ecartee') then raise exception 'Cette facture est décidée (%) : elle ne se corrige plus.', v_f.statut using errcode = '55000'; end if;
  return v_f;
end $$;
create or replace function private.filed_historiser(p_client uuid, p_document uuid, p_objet_type text, p_objet_id text, p_etape text, p_message text, p_detail jsonb default '{}') returns void language plpgsql security definer set search_path to '' as $$
declare v_acteur record;
begin
  select * into v_acteur from private.acteur_courant();
  insert into public.filed_historique (client_id, document_id, objet_type, objet_id, etape, message, detail, acteur_type, acteur_id, acteur_libelle)
  values (p_client, p_document, p_objet_type, p_objet_id, p_etape, left(p_message, 500), coalesce(p_detail, '{}'::jsonb), v_acteur.acteur_type, v_acteur.acteur_id, case when v_acteur.acteur_type = 'systeme' then 'FILED' else v_acteur.acteur_libelle end);
end $$;
create or replace function private.filed_journaliser(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb default '{}', p_entite uuid default null) returns bigint language plpgsql security definer set search_path to '' as $$
declare v_avant text := current_setting('omega.module', true); v_id bigint;
begin
  perform set_config('omega.module', 'filed', true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', coalesce(v_avant, ''), true);
  return v_id;
end $$;
create or replace function private.filed_poser_resultat(p_f public.filed_factures, p_code text, p_gravite text, p_anomalie boolean, p_message text, p_motif text default null, p_preuve jsonb default '{}', p_cle text default '') returns boolean language plpgsql security definer set search_path to '' as $$
declare v_levee uuid; v_resultat text;
begin
  if coalesce(p_anomalie, false) and private.filed_levable(p_code) then
    select l.id into v_levee from public.filed_levees l where l.facture_id = p_f.id and l.code = p_code and l.cle = coalesce(p_cle, '');
  end if;
  v_resultat := case when not coalesce(p_anomalie, false) then 'ok' when v_levee is not null then 'levee' else 'anomalie' end;
  insert into public.filed_controles (client_id, facture_id, document_id, version, code, gravite, resultat, message, motif_officiel, preuve, cle, levee_id)
  values (p_f.client_id, p_f.id, p_f.document_id, p_f.version, p_code, p_gravite, v_resultat, left(p_message, 500), p_motif, coalesce(p_preuve, '{}'::jsonb), coalesce(p_cle, ''), v_levee)
  on conflict (facture_id, code, cle) do update set gravite = excluded.gravite, resultat = excluded.resultat, message = excluded.message, motif_officiel = excluded.motif_officiel, preuve = excluded.preuve, levee_id = excluded.levee_id, version = excluded.version, cree_le = now();
  return v_resultat = 'anomalie';
end $$;
create or replace function public.enregistrer_mesure(p_client uuid, p_indicateur text, p_version int, p_periode_type text, p_periode_debut date, p_valeur numeric, p_base numeric, p_mode text, p_numerateur numeric, p_entite uuid, p_objet_type text, p_objet_id text, p_objet_libelle text, p_periode_fin date) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_i public.indicateurs; v_fin date; v_id uuid;
begin
  select * into v_i from public.indicateurs where code = p_indicateur and version = p_version and en_service;
  if not found then raise exception 'indicateur inconnu %', p_indicateur; end if;
  if p_mode not in ('a_blanc', 'reel') then raise exception 'mode'; end if;
  v_fin := case p_periode_type when 'jour' then p_periode_debut when 'mois' then (p_periode_debut + interval '1 month' - interval '1 day')::date else coalesce(p_periode_fin, p_periode_debut) end;
  if v_i.agregation = 'moyenne' then
    if coalesce(p_base, 0) <= 0 then raise exception 'base > 0 obligatoire pour une moyenne'; end if;
    if p_numerateur is null or abs(p_valeur - p_numerateur / p_base) > 0.001 then raise exception 'valeur = numerateur / base'; end if;
  elsif p_valeur is null or p_numerateur is not null then raise exception 'valeur obligatoire, sans numérateur'; end if;
  insert into public.mesures (client_id, indicateur, version, mode, periode_type, debut, fin, valeur, numerateur, base, entite_id, objet_type, objet_id, objet_libelle)
  values (p_client, p_indicateur, p_version, p_mode, p_periode_type, p_periode_debut, v_fin, p_valeur, p_numerateur, p_base, p_entite, p_objet_type, p_objet_id, p_objet_libelle)
  on conflict (client_id, indicateur, version, mode, periode_type, debut, fin, entite_id, objet_type, objet_id) do update set valeur = excluded.valeur, numerateur = excluded.numerateur, base = excluded.base
  returning id into v_id; return v_id;
end $$;
create or replace function private.enregistrer_mesure(p_client uuid, p_indicateur text, p_version int, p_periode_type text, p_periode_debut date, p_valeur numeric, p_base numeric, p_mode text, p_numerateur numeric, p_entite uuid, p_objet_type text, p_objet_id text, p_objet_libelle text, p_periode_fin date) returns uuid language sql as $$
  select public.enregistrer_mesure(p_client, p_indicateur, p_version, p_periode_type, p_periode_debut, p_valeur, p_base, p_mode, p_numerateur, p_entite, p_objet_type, p_objet_id, p_objet_libelle, p_periode_fin) $$;
create or replace function private.filed_installer(p_client uuid) returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  perform private.filed_exiger_acteur(p_client, array[]::text[]);
  insert into public.filed_reglages (client_id, entite_id, actif) values (p_client, null, true) on conflict (client_id, entite_id) do update set actif = true returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.installation', 'filed_reglages', v_id::text, '{}'::jsonb);
  return v_id;
end $$;
create or replace function private.filed_historique_immuable() returns trigger language plpgsql as $$ begin raise exception 'immuable'; end $$;
create trigger filed_historique_immuable before update or delete on public.filed_historique for each row execute function private.filed_historique_immuable();

CREATE OR REPLACE FUNCTION private.preparer_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_regle public.regles_validation;
  v_uid uuid := (select auth.uid());
  v_politique uuid;
begin
  new.statut := 'en_attente';
  new.cree_le := now();
  new.decide_le := null;
  new.execute_le := null;
  new.motif_echec := null;
  new.politique_id := null;
  if v_uid is not null then
    new.demandeur_type := 'utilisateur';
    new.demandeur_id := v_uid;
  else
    new.demandeur_type := 'systeme';
    new.demandeur_id := null;
  end if;

  select r.* into v_regle
  from public.regles_validation r
  where r.client_id = new.client_id
    and r.module = new.module
    and r.actif
    and ((r.type_action is null and new.type_action <> 'politique.activer') or r.type_action = new.type_action)
    and (r.entite_id is null or r.entite_id = new.entite_id)
    and coalesce(new.montant, 0) >= r.montant_min
    and (r.montant_max is null or coalesce(new.montant, 0) < r.montant_max)
  order by (r.type_action is not null) desc, (r.entite_id is not null) desc,
           r.montant_min desc, r.approbations_requises desc
  limit 1;

  if found then
    new.regle_id := v_regle.id;
    new.approbations_requises := v_regle.approbations_requises;
    new.roles_autorises := v_regle.roles_autorises;
    new.equipe_id := v_regle.equipe_id;
  else
    new.regle_id := null;
    new.approbations_requises := 1;
    new.roles_autorises := case when new.type_action = 'politique.activer'
                                then array['gerant'] else array['gerant', 'admin', 'valideur'] end;
    new.equipe_id := null;
  end if;

  v_politique := private.politique_couvrante(new.client_id, new.module, new.type_action, new.entite_id,
                                             new.montant, now());
  if v_politique is not null then
    new.statut := 'approuvee';
    new.decide_le := now();
    new.politique_id := v_politique;
    new.approbations_requises := 0;
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION private.appliquer_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requises smallint; v_oui int; v_non int;
begin
  select d.approbations_requises into v_requises from public.demandes_validation d where d.id = new.demande_id;
  select count(*) filter (where a.decision = 'approuve'), count(*) filter (where a.decision = 'rejete') into v_oui, v_non
  from public.approbations a where a.demande_id = new.demande_id;
  if v_non > 0 then
    update public.demandes_validation set statut = 'rejetee' where id = new.demande_id and statut = 'en_attente';
  elsif v_oui >= v_requises then
    update public.demandes_validation set statut = 'approuvee' where id = new.demande_id and statut = 'en_attente';
  end if;
  return null;
end $function$;
CREATE OR REPLACE FUNCTION private.garder_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (new.id, new.client_id, new.entite_id, new.module, new.type_action, new.objet_type, new.objet_id,
      new.resume, new.montant, new.devise, new.payload, new.demandeur_type, new.demandeur_id,
      new.approbations_requises, new.roles_autorises, new.equipe_id, new.politique_id, new.echeance,
      new.cle_idempotence, new.cree_le)
     is distinct from
     (old.id, old.client_id, old.entite_id, old.module, old.type_action, old.objet_type, old.objet_id,
      old.resume, old.montant, old.devise, old.payload, old.demandeur_type, old.demandeur_id,
      old.approbations_requises, old.roles_autorises, old.equipe_id, old.politique_id, old.echeance,
      old.cle_idempotence, old.cree_le)
  then
    raise exception 'Une demande de validation ne se modifie pas après sa création : seul son statut avance.'
      using errcode = '42501';
  end if;

  if new.statut is distinct from old.statut then
    if current_user = 'authenticated' then
      if not (old.statut = 'en_attente' and new.statut = 'annulee'
              and old.demandeur_id = (select auth.uid())) then
        raise exception 'Seul le demandeur annule une demande en attente ; le reste passe par les décisions.'
          using errcode = '42501';
      end if;
    elsif not (
         (old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee'))
      or (old.statut = 'approuvee' and new.statut in ('executee', 'echec_execution'))
      or (old.statut = 'echec_execution' and new.statut in ('executee', 'echec_execution'))
    ) then
      raise exception 'Passage de statut refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;

    if new.statut = 'approuvee' and (
      select count(*) from public.approbations a
      where a.demande_id = new.id and a.decision = 'approuve') < new.approbations_requises
    then
      raise exception 'Approbations insuffisantes : une demande n''est approuvée que par des personnes.'
        using errcode = '23514';
    end if;
    if new.statut = 'rejetee' and not exists (
      select 1 from public.approbations a where a.demande_id = new.id and a.decision = 'rejete')
    then
      raise exception 'Un rejet vient toujours d''une personne.' using errcode = '23514';
    end if;

    if new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee') then
      new.decide_le := coalesce(new.decide_le, now());
    end if;
    if new.statut = 'executee' then
      new.execute_le := coalesce(new.execute_le, now());
    end if;
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION private.exiger_decideur(p_d demandes_validation, p_decideur uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text;
  v_equipe text;
begin
  select c.role into v_role from public.comptes c
  where c.user_id = p_decideur and c.client_id = p_d.client_id;
  if v_role is null or not (v_role = any (p_d.roles_autorises)) then
    raise exception 'Ce rôle ne peut pas décider de cette demande.' using errcode = '42501';
  end if;
  if not private.perimetre_couvre(p_decideur, p_d.client_id, p_d.entite_id) then
    raise exception 'Cette demande est hors de votre périmètre.' using errcode = '42501';
  end if;
  if p_d.equipe_id is not null and not private.dans_equipe(p_decideur, p_d.equipe_id) then
    select e.nom into v_equipe from public.equipes e where e.id = p_d.equipe_id;
    raise exception 'Cette demande revient à l''équipe « % ».', coalesce(v_equipe, '?') using errcode = '42501';
  end if;
  if not private.voit_objet_pour(p_decideur, p_d.client_id, p_d.objet_type, p_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
end $function$;
CREATE OR REPLACE FUNCTION private.preparer_approbation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_uid uuid := (select auth.uid());
  v_decideur uuid;
  v_delegation uuid;
begin
  if v_uid is null then
    raise exception 'Une décision est toujours prise par une personne connectée.' using errcode = '42501';
  end if;

  select * into v_d from public.demandes_validation where id = new.demande_id for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente (%).', v_d.statut using errcode = '23514';
  end if;
  if v_d.echeance is not null and v_d.echeance <= now() then
    raise exception 'L''échéance de cette demande est passée.' using errcode = '23514';
  end if;

  new.user_id := v_uid;
  new.client_id := v_d.client_id;
  new.decide_le := now();
  v_decideur := coalesce(new.au_nom_de, v_uid);

  if new.au_nom_de is not null then
    select dl.id into v_delegation
    from public.delegations dl
    where dl.client_id = v_d.client_id
      and dl.delegant = new.au_nom_de
      and dl.delegataire = v_uid
      and dl.revoquee_le is null
      and now() >= dl.debut and now() < dl.fin
      and (dl.entite_id is null or dl.entite_id is not distinct from v_d.entite_id)
      and (dl.module is null or dl.module = v_d.module)
    order by dl.fin desc
    limit 1;
    if v_delegation is null then
      raise exception 'Aucune délégation en cours ne vous permet de décider au nom de cette personne.'
        using errcode = '42501';
    end if;
    new.delegation_id := v_delegation;
  else
    new.delegation_id := null;
  end if;

  if v_d.demandeur_id is not null and (v_uid = v_d.demandeur_id or v_decideur = v_d.demandeur_id) then
    raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
  end if;
  -- Lot 19 (coordinateur) : celui qui a saisi la pièce ne l'approuve pas.
  if (v_d.payload->'saisi_par') ? v_uid::text or (v_d.payload->'saisi_par') ? v_decideur::text then
    raise exception 'Celui qui a saisi la pièce ne l''approuve pas.' using errcode = '42501';
  end if;

  perform private.exiger_decideur(v_d, v_decideur);
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
  return new;
end $function$;
CREATE OR REPLACE FUNCTION private.publier_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.type_action = 'politique.activer' then
    return null;
  end if;
  if (tg_op = 'INSERT' and new.statut = 'approuvee')
     or (tg_op = 'UPDATE' and old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree')) then
    perform private.publier_evenement(new.client_id, 'demande.decidee.' || new.module,
      jsonb_build_object(
        'demande', new.id, 'statut', new.statut, 'type_action', new.type_action,
        'objet_type', new.objet_type, 'objet_id', new.objet_id, 'entite', new.entite_id,
        'politique', new.politique_id, 'decide_le', new.decide_le,
        'decideurs', (select coalesce(jsonb_agg(jsonb_build_object('user', a.user_id, 'au_nom_de', a.au_nom_de,
                                                                   'decision', a.decision) order by a.decide_le), '[]'::jsonb)
                      from public.approbations a where a.demande_id = new.id)),
      new.id::text || ':' || new.statut);
  end if;
  return null;
end $function$;
CREATE OR REPLACE FUNCTION private.filed_deposer_demande(p_client uuid, p_entite uuid, p_type text, p_objet_type text, p_objet_id text, p_resume text, p_montant numeric, p_payload jsonb, p_cle text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume,
                                          montant, payload, cle_idempotence)
  values (p_client, p_entite, 'filed', p_type, p_objet_type, p_objet_id, left(p_resume, 500), p_montant,
          coalesce(p_payload, '{}'::jsonb), p_cle)
  on conflict (client_id, cle_idempotence) do nothing
  returning id into v_id;
  if v_id is null then
    select d.id into v_id from public.demandes_validation d where d.client_id = p_client and d.cle_idempotence = p_cle;
  end if;
  return v_id;
end $function$;
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

  return 'type_inconnu';
end $function$;
CREATE OR REPLACE FUNCTION private.filed_traiter(p_nombre integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_issue text;
  v_err text;
  n_faits integer := 0;
  n_decisions integer := 0;
  n_ignores integer := 0;
  n_rendus integer := 0;
  n_balayes integer := 0;
  n_battements integer := 0;
begin
  perform set_config('omega.module', 'filed', true);

  for t in select * from private.prendre_travaux(array['filed.integrer', 'filed.decision'],
                                                  greatest(1, least(coalesce(p_nombre, 200), 500)),
                                                  interval '5 minutes', 'filed')
  loop
    begin
      if t.genre = 'filed.decision' then
        v_issue := private.filed_executer_decision(t.charge);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_decisions := n_decisions + 1;
      elsif coalesce(t.charge ->> 'module', 'filed') <> 'filed' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'pièce d''un autre module'));
        n_ignores := n_ignores + 1;
      elsif coalesce(t.charge ->> 'piece', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'travail sans pièce'));
        n_ignores := n_ignores + 1;
      else
        v_issue := private.filed_integrer_piece((t.charge ->> 'piece')::uuid);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_faits := n_faits + 1;
      end if;
    exception when others then
      get stacked diagnostics v_err = message_text;
      begin
        perform private.echouer_travail(t.id, 'FILED : ' || v_err);
      exception when others then
        raise warning 'FILED : travail % non rendu (%)', t.id, sqlerrm;
      end;
      n_rendus := n_rendus + 1;
    end;
  end loop;

  -- Les pièces au bout de leur lecture que l'événement n'a pas apportées, et
  -- les factures et avoirs reçus avant le moteur des factures.
  for r in
    select d.piece_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
    where (d.etat = 'en_lecture' and p.statut in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'))
       or (d.etat = 'a_traiter' and d.nature in ('facture', 'avoir')
           and not exists (select 1 from public.filed_factures f where f.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_commande'
           and not exists (select 1 from public.filed_commandes c where c.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_livraison'
           and not exists (select 1 from public.filed_receptions rc where rc.document_id = d.id))
    order by d.recu_le
    limit 500
  loop
    begin
      perform private.filed_integrer_piece(r.piece_id);
      n_balayes := n_balayes + 1;
    exception when others then
      raise warning 'FILED : pièce % non intégrée (%)', r.piece_id, sqlerrm;
    end;
  end loop;

  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.
  for r in
    select g.client_id, m.moteur from public.filed_reglages g
    cross join (values ('filed_reception'), ('filed_factures')) as m(moteur)
    left join public.battements b on b.client_id = g.client_id and b.module = m.moteur
    where g.entite_id is null and g.actif and (b.dernier_le is null or b.dernier_le < now() - interval '5 minutes')
  loop
    perform private.battre(r.client_id, r.moteur, jsonb_build_object('source', 'omega-filed'), null);
    n_battements := n_battements + 1;
  end loop;

  return jsonb_build_object('travaux', n_faits, 'decisions', n_decisions, 'ignores', n_ignores, 'rendus', n_rendus,
                            'balayes', n_balayes, 'battements', n_battements);
end $function$;
CREATE OR REPLACE FUNCTION private.filed_rapprocher_ligne(p_f filed_factures, p_l filed_factures_lignes, p_c filed_commandes_lignes, p_methode text, p_sens smallint, p_reglage filed_reglages, p_a_reception boolean)
 RETURNS filed_rapprochements_lignes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qte numeric := coalesce(p_l.quantite, 1);
  v_prix_f numeric;
  v_prix_c numeric := p_c.prix_unitaire;
  v_deja numeric;
  v_recu numeric;
  v_restant numeric;
  v_ecart_pu numeric;
  v_ecart_prix numeric := 0;
  v_ecart_qte numeric := 0;
  v_ecart_qte_montant numeric := 0;
  v_non_recu numeric := 0;
  v_non_recu_montant numeric := 0;
  v_prix_ok boolean := true;
  v_qte_ok boolean := true;
  v_resultat text := 'ok';
  v_libelle text;
  v_autres jsonb;
  v_x public.filed_rapprochements_lignes;
  v_preuve jsonb;
begin
  v_prix_f := coalesce(p_l.prix_unitaire, case when coalesce(p_l.quantite, 0) <> 0 then p_l.montant_ht / p_l.quantite end);
  select coalesce(sum(x.sens * x.quantite), 0), coalesce(jsonb_agg(distinct f2.numero) filter (where f2.numero is not null), '[]'::jsonb)
    into v_deja, v_autres
  from public.filed_rapprochements_lignes x join public.filed_factures f2 on f2.id = x.facture_id
  where x.commande_ligne_id = p_c.id and x.facture_id <> p_f.id and f2.statut <> 'ecartee';
  select coalesce(sum(q.quantite), 0) into v_recu
  from public.filed_receptions_lignes q join public.filed_receptions rc on rc.id = q.reception_id
  where q.commande_ligne_id = p_c.id and rc.statut = 'enregistree';
  v_restant := p_c.quantite - v_deja;
  v_libelle := format('ligne %s (%s)', p_l.rang, coalesce(left(p_l.designation, 60), p_l.reference_vendeur, p_l.numero, '?'));

  if p_sens = 1 then
    if v_prix_f is not null and v_prix_c is not null then
      v_ecart_pu := v_prix_f - v_prix_c;
      v_ecart_prix := round(v_ecart_pu * v_qte, 2);
      v_prix_ok := abs(v_ecart_pu) <= v_prix_c * coalesce(p_reglage.ecart_prix_pct, 0) / 100 + 0.0000005
                   or abs(v_ecart_prix) <= coalesce(p_reglage.ecart_prix_montant, 0.05);
    end if;
    v_ecart_qte := v_qte - v_restant;
    v_qte_ok := v_ecart_qte <= p_c.quantite * coalesce(p_reglage.ecart_quantite_pct, 0) / 100 + 0.0000005;
    v_ecart_qte_montant := round(greatest(v_ecart_qte, 0) * coalesce(v_prix_c, v_prix_f, 0), 2);
    if p_a_reception or coalesce(p_reglage.reception_exigee, false) then
      v_non_recu := greatest(v_deja + v_qte - v_recu, 0);
      v_non_recu_montant := round(v_non_recu * coalesce(v_prix_c, v_prix_f, 0), 2);
    end if;
    v_resultat := case when v_restant <= 0.0000005 then 'deja_facture'
                       when not v_qte_ok then 'ecart_quantite'
                       when not v_prix_ok then 'ecart_prix'
                       when v_non_recu > 0.0000005 then 'non_recu'
                       else 'ok' end;
  else
    -- Un avoir rend de la quantité : pas plus que ce qui a été facturé.
    v_ecart_qte := v_qte - greatest(v_deja, 0);
    v_resultat := case when v_ecart_qte > 0.0000005 then 'avoir_trop' else 'ok' end;
  end if;

  insert into public.filed_rapprochements_lignes (
    client_id, facture_id, document_id, facture_ligne_id, commande_ligne_id, methode, sens, quantite, prix_facture,
    prix_commande, ecart_prix_unitaire, ecart_prix, quantite_commandee, deja_facture, quantite_recue, ecart_quantite,
    ecart_quantite_montant, non_recu, non_recu_montant, resultat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_l.id, p_c.id, p_methode, p_sens, v_qte, v_prix_f, v_prix_c, v_ecart_pu,
          v_ecart_prix, p_c.quantite, v_deja, v_recu, v_ecart_qte, v_ecart_qte_montant, v_non_recu, v_non_recu_montant,
          v_resultat)
  returning * into v_x;

  -- Les contrôles de la ligne, chacun avec sa preuve ; la clé est la ligne commandée.
  v_preuve := jsonb_build_object('facture_ligne', p_l.id, 'commande_ligne', p_c.id, 'rang', p_l.rang, 'quantite', v_qte,
                                 'commande', p_c.quantite, 'deja_facture', v_deja, 'recu', v_recu, 'prix_facture', v_prix_f,
                                 'prix_commande', v_prix_c, 'autres_factures', v_autres, 'methode', p_methode);
  if p_sens = 1 then
    if v_resultat = 'deja_facture' then
      perform private.filed_poser_resultat(p_f, 'rapprochement.deja_facture', 'bloquant', true,
        format('%s : déjà facturée en totalité (%s sur %s commandé(s)%s).', v_libelle, private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(p_c.quantite),
               case when v_autres <> '[]'::jsonb then ', par ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_autres) x) else '' end),
        'DOUBLON', v_preuve, p_c.id::text);
    elsif not v_qte_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'bloquant', true,
        format('%s : %s facturé(s) pour %s restant à facturer (%s commandé(s), %s déjà facturé(s)) : %s de trop, soit %s.',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(p_c.quantite), private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(v_ecart_qte), private.filed_montant_texte(v_ecart_qte_montant)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant), p_c.id::text);
    end if;
    if not v_prix_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', case when v_ecart_pu > 0 then 'bloquant' else 'attention' end, true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne.', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix), p_c.id::text);
    end if;
    if v_non_recu > 0.0000005 then
      perform private.filed_poser_resultat(p_f, 'rapprochement.reception',
        case when coalesce(p_reglage.reception_exigee, false) then 'bloquant' else 'attention' end, true,
        format('%s : %s facturé(s) au total pour %s reçu(s) : %s non reçu(s), soit %s.', v_libelle,
               private.filed_quantite_texte(v_deja + v_qte), private.filed_quantite_texte(v_recu),
               private.filed_quantite_texte(v_non_recu), private.filed_montant_texte(v_non_recu_montant)),
        'LIVR_INCOMP', v_preuve || jsonb_build_object('non_recu', v_non_recu, 'non_recu_montant', v_non_recu_montant), p_c.id::text);
    end if;
  elsif v_resultat = 'avoir_trop' then
    perform private.filed_poser_resultat(p_f, 'avoir.quantite', 'attention', true,
      format('%s : l''avoir rend %s alors que %s seulement ont été facturé(s) sur cette ligne commandée.', v_libelle,
             private.filed_quantite_texte(v_qte), private.filed_quantite_texte(greatest(v_deja, 0))),
      'MONTANT_ERR', v_preuve, p_c.id::text);
  end if;
  return v_x;
end $function$;
CREATE OR REPLACE FUNCTION private.filed_controler_facture(p_facture uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_factures;
  v_doc public.filed_documents;
  v_four public.filed_fournisseurs;
  v_ent public.entites;
  v_reglage public.filed_reglages;
  v_regime_ter text;
  v_regime text;
  v_manque text[] := '{}';
  v_tol numeric;
  v_ecart numeric;
  v_somme numeric;
  v_nb_lignes integer;
  v_autre public.filed_factures;
  v_autre_ref text;
  v_ecartee uuid;
  v_ib public.filed_fournisseurs_ibans;
  v_autre_four public.filed_fournisseurs;
  v_pays_iban text;
  v_taux_ok numeric[];
  v_taux_fr numeric[];
  v_taux numeric;
  v_taux_trouve numeric;
  v_hors text[];
  v_tol_taux numeric;
  v_ach_siren text;
  v_ent_siren text;
  v_autre_ent public.entites;
  v_auj date;
  v_statut text;
  v_anomalies text[];
  v_bloquants integer;
  v_attention integer;
  v_lecture boolean;
  v_message text;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_reglage := private.filed_reglage(v_f.client_id, v_f.entite_id);
  v_tol := coalesce(v_reglage.tolerance_totaux, 0.05);
  v_auj := (now() at time zone coalesce(v_ent.fuseau, 'Europe/Paris'))::date;
  select count(*) into v_nb_lignes from public.filed_factures_lignes l where l.facture_id = v_f.id;

  delete from public.filed_controles where facture_id = v_f.id;

  -- ── La lecture : ce qui manque, ce qui reste à vérifier ──
  if v_f.numero is null then v_manque := array_append(v_manque, 'le numéro'); end if;
  if v_f.date_emission is null then v_manque := array_append(v_manque, 'la date d''émission'); end if;
  if v_f.montant_ttc is null then v_manque := array_append(v_manque, 'le total TTC'); end if;
  if v_f.montant_ht is null or v_f.montant_tva is null then v_manque := array_append(v_manque, 'le HT et la TVA'); end if;
  if v_f.fournisseur_id is null then v_manque := array_append(v_manque, 'le fournisseur'); end if;
  perform private.filed_poser_resultat(v_f, 'lecture.complete', 'bloquant', cardinality(v_manque) > 0,
    case when cardinality(v_manque) = 0 then 'Les champs essentiels sont lus.'
         else 'À compléter : ' || array_to_string(v_manque, ', ') || '.' end,
    'NON_CONFORME', jsonb_build_object('manque', to_jsonb(v_manque)));
  perform private.filed_poser_resultat(v_f, 'lecture.verifiee', 'bloquant', jsonb_array_length(v_f.champs_douteux) > 0,
    case when jsonb_array_length(v_f.champs_douteux) = 0 then 'Chaque valeur retenue est vérifiée sur la pièce.'
         else 'À vérifier sur la pièce : ' || (select string_agg(x ->> 'champ' || coalesce(' (' || (x ->> 'controle') || ')', ''), ', ')
                                                from jsonb_array_elements(v_f.champs_douteux) x) || '.' end,
    null, jsonb_build_object('champs', v_f.champs_douteux));

  -- ── Les montants ──
  if v_f.montant_ttc is not null then
    perform private.filed_poser_resultat(v_f, 'montant.nul', 'bloquant', v_f.montant_ttc = 0,
      case when v_f.montant_ttc = 0 then 'Total à zéro : une lecture ratée, le plus souvent. La pièce attend une personne.'
           else 'Le total n''est pas nul.' end, 'MONTANTTOTAL_ERR');
    perform private.filed_poser_resultat(v_f, 'montant.signe', 'bloquant', v_f.nature = 'facture' and v_f.montant_ttc < 0,
      case when v_f.nature = 'facture' and v_f.montant_ttc < 0
           then 'Total négatif sur une facture : c''est peut-être un avoir.' else 'Le signe du total est cohérent.' end,
      'MONTANTTOTAL_ERR', '{}'::jsonb, v_f.montant_ttc::text);
  end if;
  if v_f.montant_ht is not null and v_f.montant_tva is not null and v_f.montant_ttc is not null then
    v_ecart := v_f.montant_ht + v_f.montant_tva - v_f.montant_ttc;
    perform private.filed_poser_resultat(v_f, 'montant.coherence', 'bloquant', abs(v_ecart) > v_tol,
      case when abs(v_ecart) > v_tol
           then format('HT + TVA − TTC = %s : l''écart dépasse la tolérance de %s. La pièce attend une personne.',
                       private.filed_montant_texte(v_ecart), private.filed_montant_texte(v_tol))
           else 'HT + TVA = TTC.' end,
      'CALCUL_ERR', jsonb_build_object('ht', v_f.montant_ht, 'tva', v_f.montant_tva, 'ttc', v_f.montant_ttc,
                                       'ecart', v_ecart, 'tolerance', v_tol), v_ecart::text);
  end if;
  if v_nb_lignes > 0 and v_f.montant_ht is not null then
    select sum(l.montant_ht) into v_somme from public.filed_factures_lignes l where l.facture_id = v_f.id;
    if v_somme is not null then
      perform private.filed_poser_resultat(v_f, 'montant.lignes', 'attention', abs(v_somme - v_f.montant_ht) > v_tol,
        case when abs(v_somme - v_f.montant_ht) > v_tol
             then format('Les lignes font %s pour un HT de %s : remise ou frais au pied de la facture, ou ligne mal lue.',
                         private.filed_montant_texte(v_somme), private.filed_montant_texte(v_f.montant_ht))
             else 'La somme des lignes égale le HT.' end,
        'CALCUL_ERR', jsonb_build_object('somme_lignes', v_somme, 'ht', v_f.montant_ht, 'lignes', v_nb_lignes));
    end if;
  end if;
  if v_f.net_a_payer is not null and v_f.montant_ttc is not null and v_f.net_a_payer <> v_f.montant_ttc then
    perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'info', true,
      format('Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.',
             private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),
      null, jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc));
  end if;
  if v_f.devise <> 'EUR' then
    perform private.filed_poser_resultat(v_f, 'montant.devise', 'info', true,
      format('Montants en %s, lus tels qu''ils figurent sur la pièce, sans conversion.', v_f.devise));
  end if;
  if cardinality(v_f.montants_calcules) > 0 then
    perform private.filed_poser_resultat(v_f, 'montant.calcule', 'info', true,
      'Montant déduit des autres, faute de ligne sur la pièce : ' || array_to_string(v_f.montants_calcules, ', ') || '.',
      null, jsonb_build_object('champs', to_jsonb(v_f.montants_calcules)));
  end if;

  -- ── Les doublons : numéro, année de la date d'émission, SIREN du fournisseur
  -- (règles G1.42 et G1.45 de la DGFiP). Seule une pièce reçue plus tôt fait
  -- d'une autre son doublon. ──
  if v_f.numero_normalise is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null then
    select e.* into v_autre
    from public.filed_factures e
    join public.filed_documents d on d.id = e.document_id
    left join public.filed_fournisseurs ef on ef.id = e.fournisseur_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and (e.fournisseur_id = v_f.fournisseur_id or (v_four.siren is not null and ef.siren = v_four.siren))
      and e.numero_normalise = v_f.numero_normalise
      and extract(year from e.date_emission) = extract(year from v_f.date_emission)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
        v_ecartee := v_autre.id;
      end if;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.exact', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune autre facture de ce fournisseur ne porte ce numéro cette année.'
           when v_ecartee is not null then format('Même facture que la pièce %s : même numéro, même date, même montant. Écartée, elle reste consultable.', v_autre_ref)
           else format('Même numéro que la pièce %s, pour un montant de %s au lieu de %s : un numéro ne sert qu''une fois.',
                       v_autre_ref, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_autre.montant_ttc)) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref) end,
      coalesce(v_autre.id::text, ''));
  end if;
  if v_f.montant_ttc is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null and v_ecartee is null then
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and e.numero_normalise is distinct from v_f.numero_normalise
      and abs(e.date_emission - v_f.date_emission) <= coalesce(v_reglage.doublon_fenetre_jours, 3)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.probable', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune facture voisine du même fournisseur au même montant.'
           else format('Même fournisseur, même montant (%s), à %s jour(s) de la pièce %s : doublon probable, sous un autre numéro.',
                       private.filed_montant_texte(v_f.montant_ttc), abs(v_autre.date_emission - v_f.date_emission), v_autre_ref) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref, 'numero', v_autre.numero) end,
      coalesce(v_autre.id::text, ''));
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.fournisseur_id is distinct from v_f.fournisseur_id
      and e.numero_normalise = v_f.numero_normalise and e.montant_ttc = v_f.montant_ttc
      and e.date_emission = v_f.date_emission and e.statut <> 'ecartee'
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      perform private.filed_poser_resultat(v_f, 'doublon.autre_fournisseur', 'attention', true,
        format('Même numéro, même date et même montant que la pièce %s, sous un autre fournisseur : la même facture présentée deux fois ?', v_autre_ref),
        'DOUBLON', jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref), v_autre.id::text);
    end if;
  end if;

  -- ── Le fournisseur ──
  if v_four.id is not null then
    perform private.filed_poser_resultat(v_f, 'fournisseur.a_confirmer', 'bloquant', v_four.statut = 'a_confirmer',
      case when v_four.statut = 'a_confirmer'
           then format('Fournisseur nouveau (%s) : une personne le confirme avant tout paiement.', private.filed_libelle_fournisseur(v_four))
           else 'Fournisseur connu.' end,
      'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    if v_four.statut = 'refuse' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.refuse', 'bloquant', true,
        format('Fournisseur refusé par une personne (%s) : ne pas payer.', coalesce(v_four.motif, 'sans motif écrit')),
        'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_four.statut = 'bloque' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.bloque', 'bloquant', true,
        format('Fournisseur bloqué (%s) : aucune facture ne passe.', coalesce(v_four.motif, 'sans motif écrit')),
        'CREANCIER_ERR', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_identification = 'nom' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
        'Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.', null,
        jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_lu ? 'siren' and v_four.siren is not null then
      perform private.filed_poser_resultat(v_f, 'fournisseur.siren', 'bloquant', v_f.fournisseur_lu ->> 'siren' <> v_four.siren,
        case when v_f.fournisseur_lu ->> 'siren' <> v_four.siren
             then format('Le SIREN de la facture (%s) n''est pas celui du fournisseur retenu (%s).', v_f.fournisseur_lu ->> 'siren', v_four.siren)
             else 'Le SIREN de la facture est celui du fournisseur.' end,
        'NON_CONFORME', jsonb_build_object('lu', v_f.fournisseur_lu ->> 'siren', 'fournisseur', v_four.siren),
        v_f.fournisseur_lu ->> 'siren');
    end if;
  end if;

  -- ── L'IBAN ──
  if v_f.iban is not null then
    if not private.filed_iban_valide(v_f.iban) then
      perform private.filed_poser_resultat(v_f, 'iban.invalide', 'bloquant', true,
        format('IBAN faux (%s) : sa clé ne tombe pas juste.', private.filed_masquer_iban(v_f.iban)), 'COORD_BANC_ERR');
    elsif v_four.id is not null then
      select * into v_ib from public.filed_fournisseurs_ibans
      where client_id = v_f.client_id and fournisseur_id = v_four.id and iban = v_f.iban;
      if v_ib.statut = 'refuse' then
        perform private.filed_poser_resultat(v_f, 'iban.refuse', 'bloquant', true,
          format('IBAN déjà refusé pour ce fournisseur (%s) : ne pas payer, alerter.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque, 'refuse_le', v_ib.decide_le));
        perform private.lever_alerte_module(v_f.client_id, 'filed', 'critique',
          left(format('IBAN refusé présenté de nouveau par %s', v_four.nom), 200),
          jsonb_build_object('facture', v_f.id, 'fournisseur', v_four.id, 'iban', v_ib.iban_masque),
          'iban_refuse:' || v_ib.id::text || ':' || v_f.id::text, true, null);
      elsif v_ib.statut = 'propose' and v_four.statut = 'actif' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('Nouvel IBAN (%s) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement.', v_ib.iban_masque),
          'COORD_BANC_ERR', jsonb_build_object('iban', v_ib.iban_masque));
      elsif v_ib.statut = 'revoque' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('IBAN révoqué pour ce fournisseur (%s) : il ne sert plus.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque));
      else
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', false,
          case when v_ib.statut = 'valide' then 'IBAN connu et validé pour ce fournisseur.'
               else 'IBAN proposé avec le fournisseur nouveau : il se valide avec lui.' end);
      end if;
      select f.* into v_autre_four
      from public.filed_fournisseurs_ibans i join public.filed_fournisseurs f on f.id = i.fournisseur_id
      where i.client_id = v_f.client_id and i.iban = v_f.iban and i.statut = 'valide' and i.fournisseur_id <> v_four.id
      limit 1;
      perform private.filed_poser_resultat(v_f, 'iban.partage', 'bloquant', v_autre_four.id is not null,
        case when v_autre_four.id is null then 'L''IBAN n''appartient à aucun autre fournisseur.'
             else format('Cet IBAN est déjà celui d''un autre fournisseur (%s) : affacturage à justifier, ou fraude.', v_autre_four.nom) end,
        'COORD_BANC_ERR', case when v_autre_four.id is null then '{}'::jsonb
                               else jsonb_build_object('autre_fournisseur', v_autre_four.id) end,
        coalesce(v_autre_four.id::text, ''));
      v_pays_iban := left(v_f.iban, 2);
      if v_four.pays is not null and v_pays_iban <> replace(v_four.pays, 'EL', 'GR') then
        perform private.filed_poser_resultat(v_f, 'iban.pays', 'attention', true,
          format('IBAN tenu dans un autre pays (%s) que celui du fournisseur (%s) : à vérifier.', v_pays_iban, v_four.pays),
          'COORD_BANC_ERR', jsonb_build_object('pays_iban', v_pays_iban, 'pays_fournisseur', v_four.pays));
      end if;
    end if;
  elsif v_four.id is not null and not exists (select 1 from public.filed_fournisseurs_ibans i
                                             where i.fournisseur_id = v_four.id and i.statut = 'valide') then
    perform private.filed_poser_resultat(v_f, 'iban.absent', 'info', true,
      'Aucun IBAN sur la facture ni au référentiel : le paiement passera par un autre moyen.');
  end if;

  -- ── Le destinataire : la facture est-elle adressée à cette société ? ──
  v_ach_siren := v_f.acheteur_lu ->> 'siren';
  v_ent_siren := coalesce(v_ent.siren, case when v_ent.principale then (select c.siren from public.clients c where c.id = v_f.client_id) end);
  if v_ach_siren is not null then
    if v_ent_siren = v_ach_siren then
      perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', false,
        'Facture adressée à cette société.');
    else
      select e.* into v_autre_ent from public.entites e
      where e.client_id = v_f.client_id and e.id <> v_f.entite_id and e.siren = v_ach_siren
      limit 1;
      if v_autre_ent.id is not null then
        update public.filed_factures set entite_id = v_autre_ent.id where id = v_f.id;
        update public.filed_documents set entite_id = v_autre_ent.id where id = v_f.document_id;
        v_f.entite_id := v_autre_ent.id;
        perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text, 'reorientee',
          format('Adressée à %s (SIREN %s) : rangée dans cette société.', v_autre_ent.nom, v_ach_siren),
          jsonb_build_object('entite', v_autre_ent.id, 'siren', v_ach_siren));
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          format('Adressée à %s : rangée dans cette société.', v_autre_ent.nom), null,
          jsonb_build_object('entite', v_autre_ent.id));
      elsif v_ent_siren is null then
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          'Le SIREN de la société n''est pas renseigné : le destinataire n''est pas vérifié.');
      else
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', true,
          format('Facture adressée à une autre société (SIREN %s) que celle-ci (SIREN %s).', v_ach_siren, v_ent_siren),
          'DEST_ERR', jsonb_build_object('siren_facture', v_ach_siren, 'siren_societe', v_ent_siren), v_ach_siren);
      end if;
    end if;
  end if;

  -- ── La TVA ──
  if v_f.montant_tva is not null and v_f.montant_ht is not null then
    v_regime := case
      when v_f.montant_tva <> 0 and (select count(distinct t.taux) from public.filed_factures_tva t
                                     where t.facture_id = v_f.id and t.taux > 0) > 1 then 'mixte'
      when v_f.montant_tva <> 0 then 'normal'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and upper(t.categorie) = 'AE')
           or coalesce((v_f.mentions ->> 'autoliquidation')::boolean, false)
           or v_four.regime_tva = 'autoliquidation_btp' then 'autoliquidation'
      when private.filed_pays_ue(v_four.pays) then 'intracom'
      when v_four.pays is not null and v_four.pays <> 'FR' then 'hors_ue'
      when coalesce((v_f.mentions ->> 'franchise_293b')::boolean, false) or v_four.regime_tva = 'franchise' then 'franchise'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id
                   and upper(t.categorie) in ('E', 'Z', 'G', 'K', 'O'))
           or v_four.regime_tva = 'exonere' then 'exonere'
      else 'sans_tva' end;
    update public.filed_factures set regime_tva = v_regime where id = v_f.id;
    v_f.regime_tva := v_regime;

    if v_four.pays = 'FR' and v_f.montant_ht > coalesce(v_reglage.seuil_mentions_ht, 150)
       and v_regime not in ('franchise') and v_four.tva is null and not (v_f.fournisseur_lu ? 'tva') then
      perform private.filed_poser_resultat(v_f, 'tva.numero', 'attention', true,
        'Numéro de TVA du fournisseur absent de la facture : mention obligatoire (CGI, art. 242 nonies A), et la TVA déductible en dépend.',
        'NON_CONFORME');
    end if;
    if v_f.fournisseur_lu ->> 'tva' like 'FR%' and coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren) is not null then
      perform private.filed_poser_resultat(v_f, 'tva.numero_siren', 'bloquant',
        right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren),
        case when right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren)
             then format('Le numéro de TVA (%s) n''est pas celui du SIREN %s : il appartient à une autre société.',
                         v_f.fournisseur_lu ->> 'tva', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren))
             else 'Le numéro de TVA est bien celui du SIREN du fournisseur.' end,
        'NON_CONFORME', '{}'::jsonb, v_f.fournisseur_lu ->> 'tva');
    end if;

    v_regime_ter := private.filed_regime_territorial(v_f.client_id, v_f.entite_id);
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_fr from public.filed_taux_tva t;
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_ok from public.filed_taux_tva t
    where v_regime_ter is null or t.regime = v_regime_ter;

    if v_regime in ('normal', 'mixte') then
      if v_regime_ter = 'sans_tva' then
        perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
          'TVA facturée à une société d''un territoire où la TVA française ne s''applique pas (Guyane, Mayotte, collectivité à fiscalité propre) : à vérifier.',
          'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter), 'territoire');
      elsif exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and t.taux is not null) then
        select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
        where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_fr));
        if v_hors is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.', 'TX_TVA_ERR',
            jsonb_build_object('taux', to_jsonb(v_hors)), array_to_string(v_hors, ','));
        else
          select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
          where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_ok));
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', v_hors is not null,
            case when v_hors is null then 'Chaque taux de TVA est un taux légal du territoire de la société.'
                 else 'Taux légal ailleurs en France, pas dans le territoire de la société : ' || array_to_string(v_hors, ' %, ') || ' %.' end,
            'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter, 'taux', to_jsonb(v_hors)),
            coalesce(array_to_string(v_hors, ','), ''));
        end if;
        select sum(t.montant) into v_somme from public.filed_factures_tva t where t.facture_id = v_f.id;
        if v_somme is not null then
          perform private.filed_poser_resultat(v_f, 'tva.ventilation', 'attention', abs(v_somme - v_f.montant_tva) > v_tol,
            case when abs(v_somme - v_f.montant_tva) > v_tol
                 then format('La ventilation fait %s de TVA pour un total de %s.', private.filed_montant_texte(v_somme),
                             private.filed_montant_texte(v_f.montant_tva))
                 else 'La ventilation de la TVA égale son total.' end,
            'CALCUL_ERR', jsonb_build_object('somme', v_somme, 'tva', v_f.montant_tva));
        end if;
      elsif v_f.montant_ht <> 0 then
        -- Sans ventilation : le taux qui redonne la TVA au centime près, ligne par ligne arrondie.
        v_tol_taux := least(1.00, greatest(0.02, 0.005 * greatest(v_nb_lignes, 1)));
        v_taux_trouve := null;
        foreach v_taux in array v_taux_fr loop
          if abs(round(v_f.montant_ht * v_taux / 100, 2) - v_f.montant_tva) <= v_tol_taux then
            if v_taux_trouve is null or v_taux = any (v_taux_ok) then
              v_taux_trouve := v_taux;
            end if;
          end if;
        end loop;
        if v_taux_trouve is not null and v_taux_trouve = any (v_taux_ok) then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', false,
            format('TVA au taux légal de %s %%.', replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_taux_trouve is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('TVA au taux de %s %%, légal ailleurs en France mais pas dans le territoire de la société.',
                   replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_f.montant_tva / v_f.montant_ht * 100 between (select min(x) from unnest(v_taux_ok) x) - 0.01
                                                         and (select max(x) from unnest(v_taux_ok) x) + 0.01 then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('Taux moyen de %s %% : plusieurs taux probables, que la pièce ne détaille pas.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        else
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        end if;
      end if;
    end if;

    if v_regime = 'sans_tva' and v_f.montant_ht <> 0 then
      perform private.filed_poser_resultat(v_f, 'tva.sans_mention', 'attention', true,
        'Aucune TVA, sans mention d''exonération, d''autoliquidation ou de franchise : à vérifier.', 'TX_TVA_ERR');
    end if;
    if v_four.regime_tva = 'autoliquidation_btp' then
      perform private.filed_poser_resultat(v_f, 'tva.autoliquidation_attendue', 'bloquant', v_f.montant_tva <> 0,
        case when v_f.montant_tva <> 0
             then 'Sous-traitant du bâtiment : sa facture se fait hors taxes avec la mention « autoliquidation » (CGI, art. 283-2 nonies). La TVA facturée est une anomalie.'
             else 'Facture de sous-traitant hors taxes : la TVA sera autoliquidée.' end,
        'TX_TVA_ERR', '{}'::jsonb, v_f.montant_tva::text);
    end if;
    if v_regime in ('autoliquidation', 'intracom', 'hors_ue') then
      perform private.filed_poser_resultat(v_f, 'tva.regime', 'info', true,
        case v_regime
          when 'autoliquidation' then 'TVA due par l''acheteur (autoliquidation) : elle sera déclarée et déduite à l''écriture.'
          when 'intracom' then 'Fournisseur de l''Union européenne, sans TVA : acquisition ou service intracommunautaire, TVA autoliquidée.'
          else 'Fournisseur hors de l''Union, sans TVA : TVA autoliquidée à l''écriture, ou payée à l''importation.' end);
    end if;
  end if;

  -- ── Les dates ──
  if v_f.date_emission is not null then
    perform private.filed_poser_resultat(v_f, 'date.future', 'bloquant', v_f.date_emission > v_auj + 1,
      case when v_f.date_emission > v_auj + 1
           then format('Date d''émission dans le futur (%s) : erreur de lecture ou de saisie.', to_char(v_f.date_emission, 'DD/MM/YYYY'))
           else 'Date d''émission passée.' end,
      'NON_CONFORME', '{}'::jsonb, v_f.date_emission::text);
    if v_f.date_emission < v_auj - 365 then
      perform private.filed_poser_resultat(v_f, 'date.ancienne', 'attention', true,
        format('Pièce émise le %s, reçue le %s : plus d''un an d''écart, l''exercice est à vérifier.',
               to_char(v_f.date_emission, 'DD/MM/YYYY'), to_char(v_f.date_reception, 'DD/MM/YYYY')));
    end if;
    if v_f.echeance_lue is not null and v_f.echeance_lue < v_f.date_emission then
      perform private.filed_poser_resultat(v_f, 'date.echeance', 'attention', true,
        'Échéance antérieure à la date d''émission : à vérifier.', 'MODPAI_ERR');
    end if;
  end if;

  -- ── Le cadre de facturation (règle G1.02) ──
  if upper(coalesce(v_f.cadre_facturation, '')) in ('B2', 'S2', 'M2') then
    perform private.filed_poser_resultat(v_f, 'cadre.deja_payee', 'info', true,
      format('Facture déjà payée (cadre %s) : elle ne se paie pas une seconde fois.', upper(v_f.cadre_facturation)));
  end if;

  -- ── Le rapprochement (lot F3) : la commande, la réception, l'avoir ──
  perform private.filed_rapprocher_facture(v_f.id);

  -- ── L'état ──
  select count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'bloquant'),
         count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'attention'),
         bool_or(c.resultat = 'anomalie' and c.famille = 'lecture'),
         coalesce(array_agg(c.code order by c.code) filter (where c.resultat = 'anomalie' and c.gravite <> 'info'), '{}')
  into v_bloquants, v_attention, v_lecture, v_anomalies
  from public.filed_controles c where c.facture_id = v_f.id;

  v_statut := case when coalesce(v_lecture, false) then 'a_completer'
                   when v_ecartee is not null then 'ecartee'
                   when v_bloquants > 0 then 'bloquee'
                   else 'a_valider' end;

  if v_statut is distinct from v_f.statut or v_anomalies is distinct from v_f.anomalies then
    select string_agg(c.message, ' ' order by c.code) into v_message
    from public.filed_controles c
    where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text,
      'controlee',
      case v_statut
        when 'a_completer' then 'À compléter. ' || coalesce(v_message, '')
        when 'bloquee' then 'Bloquée. ' || coalesce(v_message, '')
        when 'ecartee' then 'Écartée : doublon exact d''une pièce reçue plus tôt.'
        else 'Contrôlée : prête à valider' || case when v_attention > 0 then format(', avec %s point(s) d''attention.', v_attention) else '.' end end,
      jsonb_build_object('statut', v_statut, 'anomalies', to_jsonb(v_anomalies), 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.controles', 'filed_facture', v_f.id::text,
      jsonb_build_object('statut', v_statut, 'version', v_f.version, 'anomalies', to_jsonb(v_anomalies)), v_f.entite_id);
  end if;

  update public.filed_factures
     set statut = v_statut, doublon_de = v_ecartee, anomalies = v_anomalies, nb_bloquants = v_bloquants,
         nb_attention = v_attention, controle_le = now(), maj_le = now()
   where id = v_f.id;
  return v_statut;
end $function$;

create trigger demandes_validation_preparer before insert on public.demandes_validation for each row execute function private.preparer_demande();
create trigger demandes_validation_garder before update on public.demandes_validation for each row execute function private.garder_demande();
create trigger demandes_validation_publier_decision after insert or update of statut on public.demandes_validation for each row execute function private.publier_decision();
create trigger approbations_preparer before insert on public.approbations for each row execute function private.preparer_approbation();
create trigger approbations_appliquer after insert on public.approbations for each row execute function private.appliquer_decision();
create policy d on public.filed_documents for select to authenticated using (client_id in (select private.mes_clients()) and private.perimetre_couvre(auth.uid(), client_id, entite_id));
create policy f on public.filed_factures for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id));
grant anon, authenticated, service_role to postgres;
