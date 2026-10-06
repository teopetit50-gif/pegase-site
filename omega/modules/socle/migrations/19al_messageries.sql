-- 19al_messageries — socle : les messageries connectées (Gmail, Microsoft 365) d'une organisation.
-- A2, 06/10/2026, sur décision du coordinateur (délégation de Teo). Pose : recette ygwbgpowzlbdaajlsqkn, puis production.
-- Écrit d'après les définitions relevées sur la recette (omega/SOCLE-EXTRAITS-COMMUN.sql, SOCLE-EXTRAITS-ENVOIS.sql).
-- Code des ouvriers : omega/functions/messagerie/ (contrat des portes : messagerie/portes.ts). Guides de Teo :
-- omega/GUIDE-GMAIL.md, omega/GUIDE-MICROSOFT.md. Le statut d'envoi « brouillon_depose » est au § 7.
--
-- Promesses du site : « Vous connectez une messagerie, c'est la seule chose à faire » et « le message reste un brouillon
-- dans votre outil ». Ce lot pose :
--   1. public.messageries : une boîte connectée par OAuth (organisation, fournisseur, adresse, état, curseur de relève).
--      Les jetons ne sont JAMAIS dans une table : seulement les ids de deux secrets du Vault (renouvellement, accès).
--      Lecture par les gérants et admins de l'organisation, colonne par colonne (ni les ids Vault ni le curseur) ;
--      aucune écriture hors des portes.
--   2. private.messageries_etats : l'état OAuth à usage unique (15 minutes) qui relie le retour de Google / Microsoft à
--      l'organisation et à la personne qui a lancé la connexion. Illisible hors des portes.
--   3. Portes de l'écran (authenticated, gérant ou admin) : messagerie_preparer (l'état), messagerie_revoquer.
--   4. Portes de l'ouvrier (service_role seulement) : messagerie_connexions, messagerie_jetons, messagerie_poser_acces,
--      messagerie_poser_curseur, messagerie_a_reconnecter, messagerie_ouvrir, messagerie_enregistrer, messagerie_oublier.
--   5. L'expéditeur : connecter une boîte crée (ou réactive) la ligne public.expediteurs (canal email, fournisseur gmail /
--      microsoft, identite = l'adresse, parametres.connexion) ; la révoquer la suspend. verrous_envoi préfère, à
--      portée égale (module), la boîte connectée à l'expéditeur partagé : c'est la promesse du site.
--   6. (§ 6) verrous_envoi : à portée égale (module), la boîte connectée passe avant l'expéditeur partagé.
--   7. (§ 7) Le statut d'envoi « brouillon_depose » : le message est déposé en brouillon dans la boîte du client, qui
--      l'enverra lui-même. Porte de l'ouvrier confirmer_brouillon (en_cours → brouillon_depose, réservée à l'ouvrier comme
--      « envoye ») ; compté comme parti pour les doublons, l'espacement et les plafonds (verrous_envoi) ; événement
--      « envoi.brouillon_depose.<module> ».
-- Rien à faire pour les travaux : private.fournisseurs_envoi porte déjà gmail et microsoft (automatique, branche = faux),
-- et confier_envoi dépose « envois.<fournisseur> ». Le coordinateur passe branche à vrai quand l'ouvrier est déployé.
-- Idempotent (if not exists, create or replace, where not exists, repères déjà réécrits sautés) ; aucune donnée retirée.
-- UN SEUL DROP, inévitable : élargir la contrainte public.envois.envois_statut_check (DROP CONSTRAINT puis ADD dans la
-- même instruction ; aucune ligne touchée, la nouvelle liste contient l'ancienne). Sauté si déjà élargie.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. public.messageries
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.messageries (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  fournisseur text not null,
  adresse text not null,
  etiquette text,
  curseur text,
  etat text not null default 'active',
  portees text[] not null default '{}'::text[],
  secret_renouvellement uuid,
  secret_acces uuid,
  acces_expire_le timestamptz,
  expediteur_id uuid,
  connecte_par uuid,
  connecte_le timestamptz not null default now(),
  releve_le timestamptz,
  erreur text,
  erreur_le timestamptz,
  maj_le timestamptz not null default now(),
  constraint messageries_pkey primary key (id),
  constraint messageries_client_id_id_key unique (client_id, id),
  constraint messageries_une_boite unique (client_id, fournisseur, adresse),
  constraint messageries_fournisseur_check check (fournisseur in ('gmail', 'microsoft')),
  constraint messageries_adresse_check check (char_length(adresse) between 3 and 320 and adresse = lower(adresse)),
  constraint messageries_etiquette_check check (char_length(etiquette) between 1 and 200),
  constraint messageries_curseur_check check (char_length(curseur) <= 8000),
  -- deconnexion : demandée à l'écran, plus de relève ni d'envoi ; l'ouvrier efface les jetons puis passe à revoquee.
  constraint messageries_etat_check check (etat in ('active', 'a_reconnecter', 'deconnexion', 'revoquee')),
  constraint messageries_erreur_check check (char_length(erreur) <= 500),
  constraint messageries_revoquee_sans_secret check (etat <> 'revoquee' or (secret_renouvellement is null and secret_acces is null)),
  constraint messageries_expediteur_fkey foreign key (client_id, expediteur_id)
    references public.expediteurs (client_id, id) on delete set null (expediteur_id)
);
comment on table public.messageries is
  'Lot 19al : les messageries connectées par OAuth (Gmail, Microsoft 365). Jetons au Vault seulement (ids). Écriture par les portes messagerie_*.';

alter table public.messageries enable row level security;
revoke all on table public.messageries from public, anon, authenticated;
-- Les gérants et admins voient leurs boîtes connectées ; jamais les ids des secrets ni le curseur.
grant select (id, client_id, fournisseur, adresse, etiquette, etat, portees, acces_expire_le, expediteur_id,
              connecte_par, connecte_le, releve_le, erreur, erreur_le, maj_le)
  on table public.messageries to authenticated;
grant all on table public.messageries to service_role;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messageries'
                 and policyname = 'gerants et admins voient les messageries') then
    create policy "gerants et admins voient les messageries" on public.messageries
      for select to authenticated
      using (private.a_un_role(client_id, array['gerant', 'admin']));
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.messageries'::regclass
                 and tgname = 'messageries_tracer' and not tgisinternal) then
    create trigger messageries_tracer after insert or delete or update on public.messageries
      for each row execute function private.tracer('+fournisseur', '+etat', '+expediteur_id');
  end if;
end $$;

create index if not exists messageries_a_relever on public.messageries (fournisseur, releve_le nulls first)
  where etat = 'active';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. private.messageries_etats
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists private.messageries_etats (
  etat text not null,
  client_id uuid not null references public.clients (id) on delete cascade,
  fournisseur text not null,
  demande_par uuid not null,
  retour_ecran text,
  cree_le timestamptz not null default now(),
  consomme_le timestamptz,
  constraint messageries_etats_pkey primary key (etat),
  constraint messageries_etats_etat_check check (etat ~ '^[A-Za-z0-9_-]{32,200}$'),
  constraint messageries_etats_fournisseur_check check (fournisseur in ('gmail', 'microsoft')),
  constraint messageries_etats_retour_check check (retour_ecran ~ '^https://' and char_length(retour_ecran) <= 500)
);
comment on table private.messageries_etats is
  'Lot 19al : état OAuth à usage unique (15 minutes) d''une connexion de messagerie. Illisible hors des portes.';
alter table private.messageries_etats enable row level security;
revoke all on table private.messageries_etats from public, anon, authenticated;
grant all on table private.messageries_etats to service_role;
create index if not exists messageries_etats_client on private.messageries_etats (client_id, cree_le);

-- Hôtes où l'écran peut demander à revenir après la connexion (pas de redirection ouverte).
insert into private.reglages (cle, valeur)
select 'messagerie_hotes_retour', 'omegaai.fr www.omegaai.fr'
where not exists (select 1 from private.reglages g where g.cle = 'messagerie_hotes_retour');

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Le Vault : écrire, lire, effacer un secret de messagerie (fonctions internes)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.messagerie_poser_secret(p_id uuid, p_nom text, p_valeur text)
returns uuid language plpgsql security definer set search_path to '' as $$
begin
  if p_valeur is null or p_valeur = '' then
    raise exception 'Secret vide.' using errcode = '22023';
  end if;
  if p_id is not null and exists (select 1 from vault.secrets s where s.id = p_id) then
    perform vault.update_secret(p_id, p_valeur);
    return p_id;
  end if;
  return vault.create_secret(p_valeur, p_nom || '_' || replace(gen_random_uuid()::text, '-', ''),
                             'Lot 19al : jeton de messagerie connectée. Ne jamais copier ailleurs.');
end $$;
comment on function private.messagerie_poser_secret(uuid, text, text) is
  'Lot 19al : crée ou remplace un secret de messagerie au Vault, rend son id.';
revoke all on function private.messagerie_poser_secret(uuid, text, text) from public, anon, authenticated;

create or replace function private.messagerie_lire_secret(p_id uuid)
returns text language sql stable security definer set search_path to '' as $$
  select s.decrypted_secret from vault.decrypted_secrets s where s.id = p_id
$$;
revoke all on function private.messagerie_lire_secret(uuid) from public, anon, authenticated;

create or replace function private.messagerie_effacer_secret(p_id uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_id is null then return; end if;
  begin
    delete from vault.secrets s where s.id = p_id;
  exception when insufficient_privilege then
    -- Sans droit de suppression sur le Vault : le secret est écrasé, plus rien n'est lisible.
    perform vault.update_secret(p_id, 'efface');
  end;
end $$;
revoke all on function private.messagerie_effacer_secret(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Portes de l'écran (authenticated : gérant ou admin de l'organisation)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.messagerie_preparer(p_client uuid, p_fournisseur text, p_retour_ecran text default null)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_etat text;
  v_hote text;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seuls un gérant ou un admin de l''organisation connectent une messagerie.' using errcode = '42501';
  end if;
  if p_fournisseur is null or p_fournisseur not in ('gmail', 'microsoft') then
    raise exception 'Fournisseur de messagerie inconnu : gmail ou microsoft.' using errcode = '22023';
  end if;
  if p_retour_ecran is not null then
    v_hote := lower(substring(p_retour_ecran from '^https://([^/:?#]+)(?:[/?#]|$)'));
    if v_hote is null or not (v_hote = any (string_to_array(
         coalesce((select g.valeur from private.reglages g where g.cle = 'messagerie_hotes_retour'), 'omegaai.fr'), ' '))) then
      raise exception 'Adresse de retour refusée : %.', left(p_retour_ecran, 80) using errcode = '22023';
    end if;
  end if;
  -- Ménage des états anciens, et pas plus de 20 connexions lancées par quart d'heure pour une organisation.
  delete from private.messageries_etats where cree_le < now() - interval '1 day';
  if (select count(*) from private.messageries_etats x
      where x.client_id = p_client and x.cree_le > now() - interval '15 minutes') >= 20 then
    raise exception 'Trop de connexions lancées : réessayez dans un quart d''heure.' using errcode = '54000';
  end if;
  v_etat := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into private.messageries_etats (etat, client_id, fournisseur, demande_par, retour_ecran)
  values (v_etat, p_client, p_fournisseur, v_uid, p_retour_ecran);
  return v_etat;
end $$;
revoke all on function private.messagerie_preparer(uuid, text, text) from public, anon;
-- La porte publique est « invoker » : authenticated exécute la fonction privée, qui vérifie elle-même le rôle (cf. 19s).
grant execute on function private.messagerie_preparer(uuid, text, text) to authenticated, service_role;

create or replace function public.messagerie_preparer(p_client uuid, p_fournisseur text, p_retour_ecran text default null)
returns text language sql set search_path to '' as $$
  select private.messagerie_preparer(p_client, p_fournisseur, p_retour_ecran)
$$;
comment on function public.messagerie_preparer(uuid, text, text) is
  'Lot 19al : état OAuth à usage unique (15 min) ; l''écran ouvre …/functions/v1/messagerie-oauth/{google|microsoft}/debut?etat=<état>.';
revoke all on function public.messagerie_preparer(uuid, text, text) from public, anon;
grant execute on function public.messagerie_preparer(uuid, text, text) to authenticated, service_role;

create or replace function private.messagerie_revoquer(p_connexion uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  m public.messageries;
begin
  select * into m from public.messageries x where x.id = p_connexion for update;
  if m.id is null or not private.a_un_role(m.client_id, array['gerant', 'admin']) then
    raise exception 'Messagerie introuvable.' using errcode = '42501';
  end if;
  if m.etat <> 'revoquee' then
    -- La boîte cesse aussitôt d'être relevée et d'émettre ; les jetons sont effacés et révoqués par l'ouvrier.
    update public.messageries set etat = 'deconnexion', erreur = null, erreur_le = null, maj_le = now()
     where id = m.id and etat in ('active', 'a_reconnecter');
    update public.expediteurs set statut = 'suspendu', maj_le = now()
     where client_id = m.client_id and id = m.expediteur_id and statut <> 'suspendu';
    perform private.deposer_travail(m.client_id, 'messagerie', 'messagerie.revoquer',
                                    jsonb_build_object('connexion', m.id), 'revoquer:' || m.id::text, 1::smallint);
  end if;
  return jsonb_build_object('connexion', m.id, 'fournisseur', m.fournisseur,
    'revocation_distante', m.fournisseur = 'gmail',
    'a_faire_par_le_client', case m.fournisseur
      when 'microsoft' then 'Retirer Omega de https://myapps.microsoft.com (compte professionnel) ou de https://account.live.com/consent/Manage (compte personnel).'
      else null end);
end $$;
revoke all on function private.messagerie_revoquer(uuid) from public, anon;
grant execute on function private.messagerie_revoquer(uuid) to authenticated, service_role;

create or replace function public.messagerie_revoquer(p_connexion uuid)
returns jsonb language sql set search_path to '' as $$
  select private.messagerie_revoquer(p_connexion)
$$;
comment on function public.messagerie_revoquer(uuid) is
  'Lot 19al : déconnecte une messagerie (gérant ou admin) : plus de relève ni d''envoi, jetons effacés puis révoqués par l''ouvrier.';
revoke all on function public.messagerie_revoquer(uuid) from public, anon;
grant execute on function public.messagerie_revoquer(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Portes de l'ouvrier (service_role seulement)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.messagerie_connexions(p_fournisseur text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.exiger_ouvrier();
  return coalesce((
    select jsonb_agg(jsonb_build_object('connexion', x.id, 'client_id', x.client_id, 'fournisseur', x.fournisseur,
                                        'adresse', x.adresse, 'etiquette', x.etiquette, 'curseur', x.curseur)
                     order by x.releve_le nulls first)
    from (select * from public.messageries m
          where m.fournisseur = p_fournisseur and m.etat = 'active'
          order by m.releve_le nulls first limit 200) x), '[]'::jsonb);
end $$;
revoke all on function private.messagerie_connexions(text) from public, anon, authenticated;

create or replace function private.messagerie_jetons(p_connexion uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare m public.messageries;
begin
  perform private.exiger_ouvrier();
  select * into m from public.messageries x where x.id = p_connexion;
  if m.id is null or m.etat = 'revoquee' then
    raise exception 'Messagerie introuvable ou révoquée.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('acces', private.messagerie_lire_secret(m.secret_acces),
                            'acces_expire_le', m.acces_expire_le,
                            'renouvellement', private.messagerie_lire_secret(m.secret_renouvellement));
end $$;
revoke all on function private.messagerie_jetons(uuid) from public, anon, authenticated;

create or replace function private.messagerie_poser_acces(p_connexion uuid, p_acces text, p_expire_le timestamptz,
                                                          p_renouvellement text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare m public.messageries;
begin
  perform private.exiger_ouvrier();
  select * into m from public.messageries x where x.id = p_connexion for update;
  if m.id is null or m.etat = 'revoquee' then
    raise exception 'Messagerie introuvable ou révoquée.' using errcode = 'P0002';
  end if;
  update public.messageries
     set secret_acces = private.messagerie_poser_secret(m.secret_acces, 'messagerie_acces', p_acces),
         acces_expire_le = p_expire_le,
         -- Microsoft fait tourner le jeton de renouvellement : le nouveau remplace l'ancien.
         secret_renouvellement = case when nullif(p_renouvellement, '') is null then m.secret_renouvellement
           else private.messagerie_poser_secret(m.secret_renouvellement, 'messagerie_renouvellement', p_renouvellement) end,
         maj_le = now()
   where id = m.id;
end $$;
revoke all on function private.messagerie_poser_acces(uuid, text, timestamptz, text) from public, anon, authenticated;

create or replace function private.messagerie_poser_curseur(p_connexion uuid, p_curseur text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.exiger_ouvrier();
  if p_curseur is null or p_curseur = '' or char_length(p_curseur) > 8000 then
    raise exception 'Curseur de relève invalide.' using errcode = '22023';
  end if;
  update public.messageries
     set curseur = p_curseur, releve_le = now(), maj_le = now(),
         erreur = case when etat = 'active' then null else erreur end
   where id = p_connexion and etat = 'active';
end $$;
revoke all on function private.messagerie_poser_curseur(uuid, text) from public, anon, authenticated;

create or replace function private.messagerie_a_reconnecter(p_connexion uuid, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare m public.messageries;
begin
  perform private.exiger_ouvrier();
  update public.messageries
     set etat = 'a_reconnecter', erreur = left(coalesce(p_motif, 'Jeton refusé par le fournisseur.'), 500),
         erreur_le = now(), maj_le = now()
   where id = p_connexion and etat = 'active'
  returning * into m;
  if m.id is not null then
    perform private.lever_alerte_module(m.client_id, 'messagerie', 'attention',
      left(format('La messagerie %s est à reconnecter : rien n''y est relevé ni déposé d''ici là.', m.adresse), 200),
      jsonb_build_object('connexion', m.id, 'fournisseur', m.fournisseur), 'reconnecter:' || m.id::text, true, null);
  end if;
end $$;
revoke all on function private.messagerie_a_reconnecter(uuid, text) from public, anon, authenticated;

create or replace function private.messagerie_ouvrir(p_etat text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare e private.messageries_etats;
begin
  perform private.exiger_ouvrier();
  select * into e from private.messageries_etats x where x.etat = p_etat;
  if e.etat is null or e.consomme_le is not null or e.cree_le < now() - interval '15 minutes' then
    raise exception 'Lien de connexion inconnu, déjà utilisé ou expiré.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('client_id', e.client_id, 'fournisseur', e.fournisseur, 'retour_ecran', e.retour_ecran);
end $$;
revoke all on function private.messagerie_ouvrir(text) from public, anon, authenticated;

create or replace function private.messagerie_enregistrer(p_etat text, p_adresse text, p_renouvellement text, p_acces text,
                                                          p_acces_expire_le timestamptz, p_portees text[], p_curseur text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  e private.messageries_etats;
  m public.messageries;
  v_adresse text := lower(btrim(p_adresse));
  v_exp uuid;
begin
  perform private.exiger_ouvrier();
  select * into e from private.messageries_etats x where x.etat = p_etat for update;
  if e.etat is null or e.consomme_le is not null or e.cree_le < now() - interval '15 minutes' then
    raise exception 'Lien de connexion inconnu, déjà utilisé ou expiré.' using errcode = 'P0002';
  end if;
  if v_adresse is null or v_adresse !~ '^[^@\s]+@[^@\s]+$' or char_length(v_adresse) > 320 then
    raise exception 'Adresse de messagerie invalide.' using errcode = '22023';
  end if;
  if nullif(p_renouvellement, '') is null or nullif(p_acces, '') is null then
    raise exception 'Jetons manquants.' using errcode = '22023';
  end if;
  update private.messageries_etats set consomme_le = now() where etat = e.etat;

  select * into m from public.messageries x
   where x.client_id = e.client_id and x.fournisseur = e.fournisseur and x.adresse = v_adresse for update;
  if m.id is null then
    insert into public.messageries (client_id, fournisseur, adresse, curseur, etat, portees, connecte_par)
    values (e.client_id, e.fournisseur, v_adresse, nullif(p_curseur, ''), 'active', coalesce(p_portees, '{}'), e.demande_par)
    returning * into m;
  end if;
  -- Reconnexion d'une boîte connue : nouveaux jetons, même curseur si la relève en avait un (rien n'est perdu ni doublé).
  update public.messageries
     set secret_renouvellement = private.messagerie_poser_secret(m.secret_renouvellement, 'messagerie_renouvellement', p_renouvellement),
         secret_acces = private.messagerie_poser_secret(m.secret_acces, 'messagerie_acces', p_acces),
         acces_expire_le = p_acces_expire_le,
         curseur = coalesce(m.curseur, nullif(p_curseur, '')),
         portees = coalesce(p_portees, '{}'),
         etat = 'active', erreur = null, erreur_le = null,
         connecte_par = e.demande_par, connecte_le = now(), maj_le = now()
   where id = m.id;

  -- L'expéditeur : la boîte connectée émet (en brouillons) au nom de l'organisation.
  select x.id into v_exp from public.expediteurs x
   where x.client_id = e.client_id and x.canal = 'email' and x.fournisseur = e.fournisseur and lower(x.identite) = v_adresse
   order by x.maj_le desc limit 1;
  if v_exp is null then
    -- secret_nom (exigé par preparer_expediteur pour une boîte déléguée) : le nom de la connexion, pas un jeton ; les
    -- jetons restent dans public.messageries → Vault.
    insert into public.expediteurs (client_id, module, canal, fournisseur, identite, parametres, secret_nom, statut, verifie_le)
    values (e.client_id, null, 'email', e.fournisseur, v_adresse, jsonb_build_object('connexion', m.id),
            'messagerie_' || replace(m.id::text, '-', ''), 'actif', now())
    returning id into v_exp;
  else
    update public.expediteurs
       set parametres = parametres || jsonb_build_object('connexion', m.id),
           secret_nom = 'messagerie_' || replace(m.id::text, '-', ''), statut = 'actif', verifie_le = now(), maj_le = now()
     where id = v_exp;
  end if;
  update public.messageries set expediteur_id = v_exp where id = m.id;
  return jsonb_build_object('connexion', m.id, 'retour_ecran', e.retour_ecran);
end $$;
revoke all on function private.messagerie_enregistrer(text, text, text, text, timestamptz, text[], text) from public, anon, authenticated;

create or replace function private.messagerie_oublier(p_connexion uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  m public.messageries;
  v_renouvellement text;
begin
  perform private.exiger_ouvrier();
  select * into m from public.messageries x where x.id = p_connexion for update;
  if m.id is null then
    return jsonb_build_object('renouvellement', null, 'fournisseur', null);
  end if;
  v_renouvellement := private.messagerie_lire_secret(m.secret_renouvellement);
  perform private.messagerie_effacer_secret(m.secret_renouvellement);
  perform private.messagerie_effacer_secret(m.secret_acces);
  update public.messageries
     set secret_renouvellement = null, secret_acces = null, acces_expire_le = null, curseur = null,
         etat = 'revoquee', erreur = null, erreur_le = null, maj_le = now()
   where id = m.id;
  update public.expediteurs set statut = 'suspendu', maj_le = now()
   where client_id = m.client_id and id = m.expediteur_id and statut <> 'suspendu';
  return jsonb_build_object('renouvellement', v_renouvellement, 'fournisseur', m.fournisseur);
end $$;
revoke all on function private.messagerie_oublier(uuid) from public, anon, authenticated;

-- Les portes publiques de l'ouvrier : service_role seulement.
create or replace function public.messagerie_connexions(p_fournisseur text)
returns jsonb language sql stable set search_path to '' as $$ select private.messagerie_connexions(p_fournisseur) $$;
create or replace function public.messagerie_jetons(p_connexion uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.messagerie_jetons(p_connexion) $$;
create or replace function public.messagerie_poser_acces(p_connexion uuid, p_acces text, p_expire_le timestamptz,
                                                         p_renouvellement text default null)
returns void language sql set search_path to '' as $$
  select private.messagerie_poser_acces(p_connexion, p_acces, p_expire_le, p_renouvellement)
$$;
create or replace function public.messagerie_poser_curseur(p_connexion uuid, p_curseur text)
returns void language sql set search_path to '' as $$ select private.messagerie_poser_curseur(p_connexion, p_curseur) $$;
create or replace function public.messagerie_a_reconnecter(p_connexion uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.messagerie_a_reconnecter(p_connexion, p_motif) $$;
create or replace function public.messagerie_ouvrir(p_etat text)
returns jsonb language sql stable set search_path to '' as $$ select private.messagerie_ouvrir(p_etat) $$;
create or replace function public.messagerie_enregistrer(p_etat text, p_adresse text, p_renouvellement text, p_acces text,
                                                         p_acces_expire_le timestamptz, p_portees text[], p_curseur text)
returns jsonb language sql set search_path to '' as $$
  select private.messagerie_enregistrer(p_etat, p_adresse, p_renouvellement, p_acces, p_acces_expire_le, p_portees, p_curseur)
$$;
create or replace function public.messagerie_oublier(p_connexion uuid)
returns jsonb language sql set search_path to '' as $$ select private.messagerie_oublier(p_connexion) $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.messagerie_connexions(text)', 'public.messagerie_jetons(uuid)',
    'public.messagerie_poser_acces(uuid, text, timestamptz, text)', 'public.messagerie_poser_curseur(uuid, text)',
    'public.messagerie_a_reconnecter(uuid, text)', 'public.messagerie_ouvrir(text)',
    'public.messagerie_enregistrer(text, text, text, text, timestamptz, text[], text)', 'public.messagerie_oublier(uuid)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
    execute format('revoke all on function %s from public, anon, authenticated', replace(f, 'public.', 'private.'));
    execute format('grant execute on function %s to service_role', replace(f, 'public.', 'private.'));
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. verrous_envoi : à portée égale, la boîte connectée passe avant l'expéditeur partagé
-- ───────────────────────────────────────────────────────────────────────────
-- Réécriture par repère (comme 19ab, 19ah) : repère absent ou multiple → le lot s'arrête sans rien changer ;
-- déjà réécrit → sauté.
do $lot$
declare
  d text;
  rep text := '    order by (x.module is not null) desc' || chr(10) || '    limit 1;';
  par text := '    order by (x.module is not null) desc, (x.fournisseur in (''gmail'', ''microsoft'')) desc, x.maj_le desc' || chr(10) || '    limit 1;';
  n integer;
begin
  select pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure) into d;
  if position('(x.fournisseur in (''gmail'', ''microsoft'')) desc' in d) = 0 then
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19al, verrous_envoi : repère absent ou multiple (%) : %', n, rep;
    end if;
    execute replace(d, rep, par);
  end if;
end $lot$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Le statut « brouillon_depose »
-- ───────────────────────────────────────────────────────────────────────────
-- 7a. La contrainte de statut : la seule façon de l'élargir est de la remplacer (une instruction, aucune ligne touchée).
do $$
begin
  if position('brouillon_depose' in coalesce((select pg_get_constraintdef(c.oid) from pg_constraint c
       where c.conrelid = 'public.envois'::regclass and c.conname = 'envois_statut_check'), '')) = 0 then
    alter table public.envois
      drop constraint if exists envois_statut_check,
      add constraint envois_statut_check check (statut in ('a_valider', 'differe', 'pret', 'en_cours', 'envoye', 'brouillon_depose',
                                                           'bloque', 'refuse', 'annule', 'expire', 'echec'));
  end if;
end $$;

-- 7b. garder_envoi : en_cours → brouillon_depose, réservé à l'ouvrier comme « envoye ». 7c. verrous_envoi : un brouillon
-- déposé compte comme parti (doublon, délai minimal, plafonds). Réécriture par repères, comme 19ab et 19ah.
do $lot$
declare
  d text;
  rep text;
  par text;
  n integer;
begin
  select pg_get_functiondef('private.garder_envoi()'::regprocedure) into d;
  if position('brouillon_depose' in d) = 0 then
    rep := '    if new.statut = ''envoye'' and coalesce(current_setting(''omega.envois_ouvrier'', true), '''') <> ''oui'' then';
    par := '    if new.statut in (''envoye'', ''brouillon_depose'') and coalesce(current_setting(''omega.envois_ouvrier'', true), '''') <> ''oui'' then';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19al, garder_envoi : repère absent ou multiple (%) : %', n, rep;
    end if;
    d := replace(d, rep, par);
    rep := '(old.statut = ''en_cours'' and new.statut in (''envoye'', ''pret'',';
    par := '(old.statut = ''en_cours'' and new.statut in (''envoye'', ''brouillon_depose'', ''pret'',';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 1 then
      raise exception 'Lot 19al, garder_envoi : repère absent ou multiple (%) : %', n, rep;
    end if;
    execute replace(d, rep, par);
  end if;

  select pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure) into d;
  if position('brouillon_depose' in d) = 0 then
    rep := '''en_cours'', ''envoye'')';
    par := '''en_cours'', ''envoye'', ''brouillon_depose'')';
    n := (length(d) - length(replace(d, rep, ''))) / length(rep);
    if n <> 4 then
      raise exception 'Lot 19al, verrous_envoi : repère attendu 4 fois (doublon, délai, plafond destinataire, plafonds), trouvé % : %', n, rep;
    end if;
    execute replace(d, rep, par);
  end if;
end $lot$;

-- 7d. La porte de l'ouvrier : le brouillon est déposé chez le client.
create or replace function private.confirmer_brouillon(p_envoi uuid, p_reference text, p_brouillon text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare
  e public.envois;
begin
  perform private.exiger_ouvrier();
  perform set_config('omega.envois_ouvrier', 'oui', true);
  -- envoye_le : l'heure du dépôt, pour l'espacement (max(coalesce(envoye_le, pret_le))). reference_externe : le Message-ID
  -- que citeront les réponses (deposer_reception les rattache à l'envoi) ; compte_rendu : le brouillon chez le fournisseur.
  update public.envois
     set statut = 'brouillon_depose', envoye_le = now(), clos_le = now(), erreur = null, bail_jusqu_au = null,
         reference_externe = left(nullif(btrim(p_reference), ''), 300),
         compte_rendu = left(nullif(btrim(p_brouillon), ''), 300)
   where id = p_envoi and statut = 'en_cours' and fournisseur in ('gmail', 'microsoft')
  returning * into e;
  perform set_config('omega.envois_ouvrier', '', true);
  if e.id is null then
    if exists (select 1 from public.envois x where x.id = p_envoi and x.statut = 'brouillon_depose') then
      return;   -- une confirmation rejouée n'est pas une faute
    end if;
    raise exception 'Envoi introuvable, pas en cours, ou pas destiné à une messagerie connectée.' using errcode = 'P0002';
  end if;
  perform private.clore_demande_envoi(e, true, null);
  perform private.publier_envoi(e, 'brouillon_depose');
end $$;
comment on function private.confirmer_brouillon(uuid, text, text) is
  'Lot 19al : l''ouvrier messagerie a déposé le message en brouillon chez le client (statut brouillon_depose, compté comme parti).';
revoke all on function private.confirmer_brouillon(uuid, text, text) from public, anon, authenticated;
grant execute on function private.confirmer_brouillon(uuid, text, text) to service_role;

create or replace function public.confirmer_brouillon(p_envoi uuid, p_reference text, p_brouillon text default null)
returns void language sql set search_path to '' as $$ select private.confirmer_brouillon(p_envoi, p_reference, p_brouillon) $$;
revoke all on function public.confirmer_brouillon(uuid, text, text) from public, anon, authenticated;
grant execute on function public.confirmer_brouillon(uuid, text, text) to service_role;

select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'messageries') as messageries,
       (select count(*) from information_schema.tables where table_schema = 'private' and table_name = 'messageries_etats') as etats,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'messagerie\_%') as portes_publiques,
       position('(x.fournisseur in (''gmail'', ''microsoft'')) desc'
                in pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure)) > 0 as verrous,
       position('brouillon_depose' in (select pg_get_constraintdef(c.oid) from pg_constraint c
         where c.conrelid = 'public.envois'::regclass and c.conname = 'envois_statut_check')) > 0 as statut,
       position('brouillon_depose' in pg_get_functiondef('private.garder_envoi()'::regprocedure)) > 0 as garde,
       (length(pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure))
        - length(replace(pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure),
                         'brouillon_depose', ''))) / length('brouillon_depose') as verrous_brouillon;
