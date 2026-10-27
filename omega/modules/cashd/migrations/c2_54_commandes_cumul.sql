-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_54 : le plafond d'encours porte sur le cumul ; une référence rejouée avec un autre montant est refusée
-- (27/10/2026, session C2 — TNUIT-01, TNUIT-08, contre-recette de nuit du testeur)
-- ═══════════════════════════════════════════════════════════════════════════
-- TNUIT-01 (important) : quatre commandes de 300 € passaient toutes pour un plafond de 1 000 € et 585 € d'encours : la
-- vérification ne comptait pas les commandes déjà autorisées et pas encore facturées. Désormais le plafond porte sur le
-- cumul : encours + commandes autorisées (ou débloquées par un responsable) pour le même compte dans la fenêtre de la
-- règle (cashd_reglages.commandes_fenetre_jours, 30 jours par défaut, de 1 à 180) + la commande. La réponse le dit
-- (« engage », « fenetre_jours »), la demande de validation aussi. Une commande facturée dans la fenêtre compte deux fois
-- (sa facture dans l'encours, sa commande dans l'engagé) : le plafond bloque plus tôt, jamais plus tard — choix prudent,
-- faute de lien commande → facture dans les exports.
-- TNUIT-08 : rejouée avec un autre montant, une référence rendait l'ancienne décision en silence. Elle est refusée
-- (23505), avec les deux montants et la marche à suivre : une commande modifiée se vérifie sous une nouvelle référence.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

alter table public.cashd_reglages add column if not exists commandes_fenetre_jours smallint not null default 30;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_commandes_fenetre_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_commandes_fenetre_check check (commandes_fenetre_jours between 1 and 180);
  end if;
end $c$;
alter table public.cashd_commandes add column if not exists engage numeric not null default 0;
alter table public.cashd_commandes add column if not exists fenetre_jours smallint;
comment on column public.cashd_commandes.engage is 'Commandes déjà autorisées dans la fenêtre, comptées avec l''encours à la vérification (c2_54).';
comment on column public.cashd_reglages.commandes_fenetre_jours is 'Fenêtre (jours) des commandes autorisées comptées avec l''encours face au plafond (c2_54).';

-- Ce qui est déjà engagé pour un compte : les commandes autorisées ou débloquées dans la fenêtre.
create or replace function private.cashd_commandes_engagees(p_compte uuid, p_fenetre integer)
 returns numeric language sql stable security definer set search_path to ''
as $function$
  select coalesce(sum(o.montant), 0)
  from public.cashd_commandes o left join public.demandes_validation d on d.id = o.demande_id
  where o.compte_id = p_compte and o.cree_le > now() - make_interval(days => greatest(coalesce(p_fenetre, 30), 1))
    and (o.statut = 'autorisee' or d.statut = 'approuvee')
$function$;

-- Régler la fenêtre (gérant ou administrateur).
create or replace function public.cashd_regler_fenetre_commandes(p_client uuid, p_jours integer)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
begin
  perform private.cashd_exiger_gestion(p_client);
  if p_jours is null or p_jours not between 1 and 180 then
    raise exception 'La fenêtre des commandes compte de 1 à 180 jours.' using errcode = '22023';
  end if;
  update public.cashd_reglages set commandes_fenetre_jours = p_jours, maj_le = now() where client_id = p_client;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.fenetre_commandes', 'cashd_reglages', p_client::text,
    jsonb_build_object('jours', p_jours, 'par', (select auth.uid())), null);
  return jsonb_build_object('fenetre_jours', p_jours);
end $function$;

-- La vérification (c2_50), sur le cumul.
create or replace function private.cashd_verifier_commande_coeur(p_compte uuid, p_montant numeric, p_reference text, p_par uuid, p_source text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_encours numeric;
  v_engage numeric;
  v_fenetre integer;
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
  -- c2_54 : le plafond porte sur le cumul — l'encours, plus les commandes déjà autorisées (ou débloquées) pour ce compte
  -- dans la fenêtre de la règle, qui ne sont pas encore toutes facturées : découper une commande ne le contourne plus
  v_fenetre := coalesce((select g.commandes_fenetre_jours from public.cashd_reglages g where g.client_id = c.client_id), 30);
  v_engage := private.cashd_commandes_engagees(c.id, v_fenetre);
  v_statut := case when c.plafond_encours is null or coalesce(v_encours, 0) + v_engage + p_montant <= c.plafond_encours then 'autorisee' else 'bloquee' end;
  insert into public.cashd_commandes (client_id, compte_id, reference, montant, encours, engage, fenetre_jours, plafond, statut, demande_par)
  values (c.client_id, c.id, left(nullif(btrim(p_reference), ''), 120), round(p_montant, 2), coalesce(v_encours, 0), v_engage, v_fenetre,
          c.plafond_encours, v_statut, p_par)
  returning id into v_id;
  if v_statut = 'bloquee' then
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
    values (c.client_id, c.entite_id, 'cashd', 'cashd.commande_hors_plafond', 'cashd_commandes', v_id::text,
            left(format('Commande %s de %s au-delà du plafond : %s, encours %s et %s déjà autorisés sur %s jours, pour un plafond de %s',
                        coalesce(p_reference, ''), c.nom, private.cashd_eur(round(p_montant, 2)), private.cashd_eur(coalesce(v_encours, 0)),
                        private.cashd_eur(v_engage), v_fenetre, private.cashd_eur(c.plafond_encours)), 500),
            round(p_montant, 2),
            jsonb_build_object('commande', v_id, 'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
                               'montant', round(p_montant, 2), 'encours', coalesce(v_encours, 0), 'engage', v_engage, 'fenetre_jours', v_fenetre,
                               'plafond', c.plafond_encours, 'reference', p_reference, 'source', p_source),
            now() + interval '3 days', 'cashd:commande:' || v_id::text)
    returning id into v_dem;
    update public.cashd_commandes set demande_id = v_dem where id = v_id;
    perform private.cashd_alerter_commercial(c.id, 'attention',
      format('Commande %s de %s bloquée : elle ferait passer l''encours à %s pour un plafond de %s.', coalesce(p_reference, ''), c.nom,
             private.cashd_eur(coalesce(v_encours, 0) + v_engage + round(p_montant, 2)), private.cashd_eur(c.plafond_encours)),
      jsonb_build_object('commande', v_id, 'demande', v_dem), 'commande:' || v_id::text);
  end if;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.commande_verifiee', 'cashd_comptes', c.id::text,
    jsonb_build_object('commande', v_id, 'reference', p_reference, 'montant', round(p_montant, 2), 'encours', v_encours, 'plafond', c.plafond_encours,
                       'statut', v_statut, 'demande', v_dem, 'source', p_source, 'engage', v_engage, 'fenetre_jours', v_fenetre), c.entite_id);
  return jsonb_build_object('commande', v_id, 'statut', v_statut, 'encours', coalesce(v_encours, 0), 'engage', v_engage, 'fenetre_jours', v_fenetre,
                            'plafond', c.plafond_encours, 'demande', v_dem);
end $function$;

-- L'état d'une commande (c2_50), avec le cumul vu à sa vérification.
create or replace function private.cashd_commande_decision(p_commande uuid)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object('commande', o.id, 'reference', o.reference, 'montant', o.montant, 'encours', o.encours, 'plafond', o.plafond,
    'engage', coalesce(o.engage, 0), 'fenetre_jours', o.fenetre_jours,
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

-- Le raccord (c2_50) : une référence rejouée avec un autre montant est refusée.
create or replace function public.cashd_commande(p_cle text, p_compte text, p_montant numeric, p_reference text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  k public.cashd_cles_commandes;
  v_compte uuid;
  v_n integer;
  v_deja uuid;
  v_deja_montant numeric;
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
    select o.id, o.montant into v_deja, v_deja_montant from public.cashd_commandes o
     where o.compte_id = v_compte and o.reference = left(btrim(p_reference), 120) and o.cree_le > now() - interval '90 days'
     order by o.cree_le desc limit 1;
    if v_deja is not null then
      -- c2_54 : une référence rejouée avec un autre montant est refusée, jamais confondue avec l'ancienne décision
      if round(p_montant, 2) is distinct from v_deja_montant then
        raise exception 'La commande % a déjà été vérifiée pour % ; elle revient pour % : une commande modifiée se vérifie sous une nouvelle référence (par exemple %-2).',
          btrim(p_reference), private.cashd_eur(v_deja_montant), private.cashd_eur(round(p_montant, 2)), btrim(p_reference)
          using errcode = '23505';
      end if;
      return private.cashd_commande_decision(v_deja) || jsonb_build_object('deja_verifiee', true);
    end if;
  end if;
  v_r := private.cashd_verifier_commande_coeur(v_compte, p_montant, p_reference, null, 'raccord:' || k.prefixe);
  return private.cashd_commande_decision((v_r ->> 'commande')::uuid) || jsonb_build_object('deja_verifiee', false);
end $function$;

revoke execute on function private.cashd_commandes_engagees(uuid, integer) from public, anon, authenticated;
revoke execute on function private.cashd_verifier_commande_coeur(uuid, numeric, text, uuid, text) from public, anon, authenticated;
revoke execute on function private.cashd_commande_decision(uuid) from public, anon, authenticated;
revoke execute on function public.cashd_regler_fenetre_commandes(uuid, integer) from public, anon;
grant execute on function public.cashd_regler_fenetre_commandes(uuid, integer) to authenticated, service_role;
revoke execute on function public.cashd_commande(text, text, numeric, text) from public;
grant execute on function public.cashd_commande(text, text, numeric, text) to anon, authenticated, service_role;
