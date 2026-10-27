-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_50 : le raccord d'un logiciel de commandes au plafond d'encours (27/10/2026, session C2 — G19, C38)
-- ═══════════════════════════════════════════════════════════════════════════
-- C38 : « Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable. » La porte existait
-- (cashd_verifier_commande, c2_03) mais seul un membre connecté ou le serveur pouvait l'appeler : aucun logiciel de
-- commandes ne pouvait s'y raccorder. Ce lot ouvre un raccord générique, sans connecteur propre à un éditeur :
--   · une CLÉ DE RACCORD par logiciel, créée par le gérant ou l'administrateur (cashd_creer_cle_commandes) : montrée une
--     seule fois, gardée en empreinte SHA-256 (jamais en clair), révocable (cashd_revoquer_cle_commandes), avec sa date de
--     dernière utilisation ;
--   · public.cashd_commande(p_cle, p_compte, p_montant, p_reference) : appelable par le logiciel avec la clé publique du
--     projet (POST /rest/v1/rpc/cashd_commande) ; elle retrouve le compte par sa référence, vérifie le plafond comme la
--     porte (même calcul, même demande de validation, même alerte au commercial, même journal) et rend « autorisee » ou
--     « bloquee » ; une même référence de commande rejouée rend la même décision, sans doublon ;
--   · public.cashd_commande_etat(p_cle, p_commande) : où en est une commande bloquée — en attente de décision, débloquée
--     par un responsable, refusée, ou expirée sans décision (elle reste bloquée).
-- Le logiciel garde la main sur sa commande : il la retient tant que CASHD ne rend pas « autorisee » ou « debloquee ».
-- Aucun secret n'est stocké en clair ; une clé ne lit que les comptes et commandes de son organisation.
-- Contrat d'intégration : omega/modules/cashd/API-COMMANDES.md.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

create table if not exists public.cashd_cles_commandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  libelle text not null check (char_length(btrim(libelle)) between 1 and 80),
  prefixe text not null check (char_length(prefixe) = 12),
  empreinte text not null unique check (empreinte ~ '^[0-9a-f]{64}$'),
  cree_par uuid,
  cree_le timestamptz not null default now(),
  revoquee_le timestamptz,
  revoquee_par uuid,
  derniere_utilisation_le timestamptz
);
comment on table public.cashd_cles_commandes is 'Clés de raccord d''un logiciel de commandes au plafond d''encours (c2_50) : empreinte SHA-256 seulement.';
alter table public.cashd_cles_commandes enable row level security;
revoke all on public.cashd_cles_commandes from anon, authenticated;

-- La vérification, sans contrôle d'appelant : partagée par la porte des membres et par le raccord.
create or replace function private.cashd_verifier_commande_coeur(p_compte uuid, p_montant numeric, p_reference text, p_par uuid, p_source text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_encours numeric;
  v_id uuid;
  v_dem uuid;
  v_statut text;
begin
  select * into c from public.cashd_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Le montant de la commande doit être supérieur à 0 €.' using errcode = '22023';
  end if;
  select coalesce(b.encours, 0) into v_encours from public.cashd_balance_agee b where b.compte_id = c.id;
  v_statut := case when c.plafond_encours is null or coalesce(v_encours, 0) + p_montant <= c.plafond_encours then 'autorisee' else 'bloquee' end;
  insert into public.cashd_commandes (client_id, compte_id, reference, montant, encours, plafond, statut, demande_par)
  values (c.client_id, c.id, left(nullif(btrim(p_reference), ''), 120), round(p_montant, 2), coalesce(v_encours, 0), c.plafond_encours, v_statut, p_par)
  returning id into v_id;
  if v_statut = 'bloquee' then
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
    values (c.client_id, c.entite_id, 'cashd', 'cashd.commande_hors_plafond', 'cashd_commandes', v_id::text,
            left(format('Commande %s de %s au-delà du plafond : %s, encours %s pour un plafond de %s', coalesce(p_reference, ''), c.nom,
                        private.cashd_eur(round(p_montant, 2)), private.cashd_eur(coalesce(v_encours, 0)), private.cashd_eur(c.plafond_encours)), 500),
            round(p_montant, 2),
            jsonb_build_object('commande', v_id, 'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
                               'montant', round(p_montant, 2), 'encours', coalesce(v_encours, 0), 'plafond', c.plafond_encours, 'reference', p_reference,
                               'source', p_source),
            now() + interval '3 days', 'cashd:commande:' || v_id::text)
    returning id into v_dem;
    update public.cashd_commandes set demande_id = v_dem where id = v_id;
    perform private.cashd_alerter_commercial(c.id, 'attention',
      format('Commande %s de %s bloquée : elle ferait passer l''encours à %s pour un plafond de %s.', coalesce(p_reference, ''), c.nom,
             private.cashd_eur(coalesce(v_encours, 0) + round(p_montant, 2)), private.cashd_eur(c.plafond_encours)),
      jsonb_build_object('commande', v_id, 'demande', v_dem), 'commande:' || v_id::text);
  end if;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.commande_verifiee', 'cashd_comptes', c.id::text,
    jsonb_build_object('commande', v_id, 'reference', p_reference, 'montant', round(p_montant, 2), 'encours', v_encours, 'plafond', c.plafond_encours,
                       'statut', v_statut, 'demande', v_dem, 'source', p_source), c.entite_id);
  return jsonb_build_object('commande', v_id, 'statut', v_statut, 'encours', coalesce(v_encours, 0), 'plafond', c.plafond_encours, 'demande', v_dem);
end $function$;

-- La porte des membres (c2_03), sur le cœur partagé.
create or replace function public.cashd_verifier_commande(p_compte uuid, p_montant numeric, p_reference text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_uid uuid := (select auth.uid());
begin
  select * into c from public.cashd_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null then
    if private.cashd_role_session() not in ('service_role', 'postgres') then
      raise exception 'Une commande se vérifie par un membre de l''organisation, ou par le serveur.' using errcode = '42501';
    end if;
  elsif not (private.voit_entite(c.client_id, c.entite_id) and private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])) then
    raise exception 'Une commande se vérifie par un membre de l''organisation, ou par le serveur.' using errcode = '42501';
  end if;
  return private.cashd_verifier_commande_coeur(p_compte, p_montant, p_reference, v_uid, case when v_uid is null then 'serveur' else 'membre' end);
end $function$;

-- L'organisation dont la clé est donnée (active), ou une erreur ; la date d'usage est notée.
create or replace function private.cashd_cle_commandes(p_cle text)
 returns public.cashd_cles_commandes language plpgsql security definer set search_path to ''
as $function$
declare k public.cashd_cles_commandes;
begin
  if p_cle is null or p_cle !~ '^cashd_cmd_[0-9a-f]{48}$' then
    raise exception 'Clé de raccord absente ou mal formée.' using errcode = '28000';
  end if;
  select * into k from public.cashd_cles_commandes x
   where x.empreinte = encode(extensions.digest(convert_to(p_cle, 'UTF8'), 'sha256'), 'hex') and x.revoquee_le is null;
  if k.id is null then
    raise exception 'Clé de raccord inconnue ou révoquée.' using errcode = '28000';
  end if;
  update public.cashd_cles_commandes set derniere_utilisation_le = now() where id = k.id;
  return k;
end $function$;

-- Créer une clé de raccord (gérant ou administrateur) : la clé n'est rendue qu'ici, une fois.
create or replace function public.cashd_creer_cle_commandes(p_client uuid, p_libelle text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_cle text := 'cashd_cmd_' || encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  perform private.cashd_exiger_gestion(p_client);
  if not exists (select 1 from public.cashd_reglages g where g.client_id = p_client) then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if nullif(btrim(p_libelle), '') is null or char_length(btrim(p_libelle)) > 80 then
    raise exception 'Nommez le logiciel raccordé (80 caractères au plus).' using errcode = '22023';
  end if;
  if (select count(*) from public.cashd_cles_commandes x where x.client_id = p_client and x.revoquee_le is null) >= 5 then
    raise exception 'Cinq clés de raccord actives au plus : révoquez-en une.' using errcode = '54000';
  end if;
  insert into public.cashd_cles_commandes (client_id, libelle, prefixe, empreinte, cree_par)
  values (p_client, btrim(p_libelle), left(v_cle, 12), encode(extensions.digest(convert_to(v_cle, 'UTF8'), 'sha256'), 'hex'), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.cle_commandes_creee', 'cashd_cles_commandes', v_id::text,
    jsonb_build_object('libelle', btrim(p_libelle), 'prefixe', left(v_cle, 12), 'par', (select auth.uid())), null);
  return jsonb_build_object('id', v_id, 'cle', v_cle, 'prefixe', left(v_cle, 12),
    'phrase', 'Copiez cette clé maintenant : elle ne sera plus jamais affichée. Donnez-la à votre logiciel de commandes, avec l''adresse du raccord.');
end $function$;

-- Révoquer une clé (gérant ou administrateur).
create or replace function public.cashd_revoquer_cle_commandes(p_cle_id uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare k public.cashd_cles_commandes;
begin
  select * into k from public.cashd_cles_commandes where id = p_cle_id;
  if k.id is null then
    raise exception 'Clé introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(k.client_id);
  update public.cashd_cles_commandes set revoquee_le = coalesce(revoquee_le, now()), revoquee_par = coalesce(revoquee_par, (select auth.uid()))
   where id = k.id;
  perform private.journaliser_module(k.client_id, 'cashd', 'cashd.cle_commandes_revoquee', 'cashd_cles_commandes', k.id::text,
    jsonb_build_object('libelle', k.libelle, 'prefixe', k.prefixe, 'par', (select auth.uid())), null);
  return jsonb_build_object('id', k.id, 'revoquee', true);
end $function$;

-- Les clés de l'organisation, sans leur empreinte.
create or replace function public.cashd_cles_commandes_liste(p_client uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
begin
  perform private.cashd_exiger_gestion(p_client);
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'libelle', x.libelle, 'prefixe', x.prefixe, 'cree_le', x.cree_le,
                                                       'revoquee_le', x.revoquee_le, 'derniere_utilisation_le', x.derniere_utilisation_le)
                                    order by x.cree_le desc)
                   from public.cashd_cles_commandes x where x.client_id = p_client), '[]'::jsonb);
end $function$;

-- L'état d'une commande vérifiée, en mots stables pour un logiciel.
create or replace function private.cashd_commande_decision(p_commande uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object('commande', o.id, 'reference', o.reference, 'montant', o.montant, 'encours', o.encours, 'plafond', o.plafond,
    'decision', case when o.statut = 'autorisee' then 'autorisee'
                     when d.statut = 'approuvee' then 'debloquee'
                     when d.statut = 'rejetee' then 'refusee'
                     when d.statut in ('annulee', 'expiree') then 'expiree'
                     else 'en_attente' end,
    'livrable', o.statut = 'autorisee' or d.statut = 'approuvee',
    'decide_le', d.decide_le)
  from public.cashd_commandes o left join public.demandes_validation d on d.id = o.demande_id
  where o.id = p_commande
$function$;

-- Le raccord : vérifier une commande avec une clé (appelable par un logiciel, sans session).
create or replace function public.cashd_commande(p_cle text, p_compte text, p_montant numeric, p_reference text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  k public.cashd_cles_commandes;
  v_compte uuid;
  v_n integer;
  v_deja uuid;
  v_r jsonb;
begin
  k := private.cashd_cle_commandes(p_cle);
  if nullif(btrim(p_compte), '') is null then
    raise exception 'Donnez la référence du compte client, telle qu''elle figure dans votre facturier.' using errcode = '22023';
  end if;
  select count(*), min(x.id::text)::uuid into v_n, v_compte from public.cashd_comptes x
   where x.client_id = k.client_id and lower(x.reference) = lower(btrim(p_compte));
  if v_n = 0 then
    raise exception 'Compte client inconnu de CASHD : %.', btrim(p_compte) using errcode = 'P0002';
  elsif v_n > 1 then
    raise exception 'Plusieurs comptes portent la référence % : précisez-la dans CASHD.', btrim(p_compte) using errcode = '21000';
  end if;
  -- une même commande rejouée (même compte, même référence) rend la même décision, sans doublon
  if nullif(btrim(p_reference), '') is not null then
    select o.id into v_deja from public.cashd_commandes o
     where o.compte_id = v_compte and o.reference = left(btrim(p_reference), 120) and o.cree_le > now() - interval '90 days'
     order by o.cree_le desc limit 1;
    if v_deja is not null then
      return private.cashd_commande_decision(v_deja) || jsonb_build_object('deja_verifiee', true);
    end if;
  end if;
  v_r := private.cashd_verifier_commande_coeur(v_compte, p_montant, p_reference, null, 'raccord:' || k.prefixe);
  return private.cashd_commande_decision((v_r ->> 'commande')::uuid) || jsonb_build_object('deja_verifiee', false);
end $function$;

-- Où en est une commande (même clé, même organisation).
create or replace function public.cashd_commande_etat(p_cle text, p_commande uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare k public.cashd_cles_commandes;
begin
  k := private.cashd_cle_commandes(p_cle);
  if not exists (select 1 from public.cashd_commandes o where o.id = p_commande and o.client_id = k.client_id) then
    raise exception 'Commande inconnue pour cette clé.' using errcode = 'P0002';
  end if;
  return private.cashd_commande_decision(p_commande);
end $function$;

revoke execute on function private.cashd_verifier_commande_coeur(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function private.cashd_cle_commandes(text) from public, anon, authenticated;
revoke execute on function private.cashd_commande_decision(uuid) from public, anon, authenticated;
revoke execute on function public.cashd_verifier_commande(uuid, numeric, text) from public, anon;
grant execute on function public.cashd_verifier_commande(uuid, numeric, text) to authenticated, service_role;
revoke execute on function public.cashd_creer_cle_commandes(uuid, text) from public, anon;
grant execute on function public.cashd_creer_cle_commandes(uuid, text) to authenticated, service_role;
revoke execute on function public.cashd_revoquer_cle_commandes(uuid) from public, anon;
grant execute on function public.cashd_revoquer_cle_commandes(uuid) to authenticated, service_role;
revoke execute on function public.cashd_cles_commandes_liste(uuid) from public, anon;
grant execute on function public.cashd_cles_commandes_liste(uuid) to authenticated, service_role;
-- le raccord : appelé par un logiciel avec la clé publique du projet ; la clé de raccord fait foi
revoke execute on function public.cashd_commande(text, text, numeric, text) from public;
grant execute on function public.cashd_commande(text, text, numeric, text) to anon, authenticated, service_role;
revoke execute on function public.cashd_commande_etat(text, uuid) from public;
grant execute on function public.cashd_commande_etat(text, uuid) to anon, authenticated, service_role;
