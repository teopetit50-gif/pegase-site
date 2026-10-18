-- FILED, lot 38 (a4_46) — l'historique des pièces est chaîné : chaque ligne porte l'empreinte de la précédente.
--
-- Chiffrage FILED, n° 114 : « le journal ne se modifie pas, y compris par nous ». Le socle garde déjà
-- public.filed_historique contre la modification et la suppression (filed_historique_immuable) ; un accès direct à la
-- base pourrait pourtant réécrire une ligne sans trace. Désormais :
--   · chaque ligne nouvelle reçoit son rang dans l'organisation (1, 2, 3…), l'empreinte de la ligne précédente et la
--     sienne : SHA-256 de l'empreinte précédente et de la ligne entière (colonnes nulles omises), en UTC ;
--   · public.filed_verifier_historique(organisation) recalcule la chaîne : intacte, ou rompue (au rang donné), et les
--     rangs manquants (une ligne retirée laisse un trou visible) ;
--   · public.filed_sceau_historique(organisation) rend le dernier rang et sa dernière empreinte, à noter hors d'Omega
--     (un sceau noté ailleurs prouve qu'aucune ligne antérieure n'a été réécrite depuis).
-- Les lignes antérieures au lot restent sans rang (rien n'est réécrit) ; la chaîne part de la première ligne nouvelle.
-- Le déclencheur est nommé pour passer après tout autre déclencheur BEFORE INSERT de la table.
-- Limite dite : une colonne ajoutée plus tard avec une valeur par défaut changerait le calcul des lignes anciennes.
-- Migration idempotente. Aucun DROP, aucune suppression, aucune mise à jour de ligne ; aucun envoi.

alter table public.filed_historique add column if not exists rang bigint;
alter table public.filed_historique add column if not exists empreinte_precedente text;
alter table public.filed_historique add column if not exists empreinte text;
create unique index if not exists filed_historique_rang_key on public.filed_historique (client_id, rang) where rang is not null;

-- L'empreinte d'une ligne, telle que le déclencheur la calcule et que la vérification la recalcule.
create or replace function private.filed_empreinte_historique(p public.filed_historique)
returns text language sql immutable set search_path to '' set timezone to 'UTC' as $$
  select encode(sha256(convert_to(coalesce(p.empreinte_precedente, '') || '|'
           || jsonb_strip_nulls(to_jsonb(p) - 'empreinte' - 'empreinte_precedente')::text, 'UTF8')), 'hex')
$$;
revoke all on function private.filed_empreinte_historique(public.filed_historique) from public, anon, authenticated;
grant execute on function private.filed_empreinte_historique(public.filed_historique) to service_role;

create or replace function private.filed_historique_chainer()
returns trigger language plpgsql security definer set search_path to '' set timezone to 'UTC' as $$
declare v_rang bigint; v_prec text;
begin
  perform pg_advisory_xact_lock(hashtextextended('filed_historique|' || new.client_id::text, 0));
  select h.rang, h.empreinte into v_rang, v_prec
    from public.filed_historique h where h.client_id = new.client_id and h.rang is not null
   order by h.rang desc limit 1;
  new.rang := coalesce(v_rang, 0) + 1;
  new.empreinte_precedente := v_prec;
  new.empreinte := null;
  new.empreinte := private.filed_empreinte_historique(new);
  return new;
end $$;
revoke all on function private.filed_historique_chainer() from public, anon, authenticated;
grant execute on function private.filed_historique_chainer() to service_role;

do $do$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_historique'::regclass and tgname = 'zz_filed_historique_chainer') then
    create trigger zz_filed_historique_chainer before insert on public.filed_historique
      for each row execute function private.filed_historique_chainer();
  end if;
end $do$;

create or replace function private.filed_verifier_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' set timezone to 'UTC' as $$
declare r public.filed_historique; v_prec text; v_rang bigint; n bigint := 0; v_trous bigint := 0; v_rompue bigint;
        v_avant bigint; v_premier bigint;
begin
  select count(*) into v_avant from public.filed_historique h where h.client_id = p_client and h.rang is null;
  for r in select * from public.filed_historique h where h.client_id = p_client and h.rang is not null order by h.rang loop
    if v_premier is null then v_premier := r.rang; end if;
    if v_rang is not null and r.rang > v_rang + 1 then
      v_trous := v_trous + (r.rang - v_rang - 1);       -- des lignes manquent : le lien ne peut être vérifié, la ligne si
    elsif v_rang is not null and r.empreinte_precedente is distinct from v_prec then
      v_rompue := r.rang; exit;
    end if;
    if r.empreinte is distinct from private.filed_empreinte_historique(r) then
      v_rompue := r.rang; exit;
    end if;
    v_prec := r.empreinte; v_rang := r.rang; n := n + 1;
  end loop;
  return jsonb_build_object('client', p_client, 'lignes_chainees', n, 'lignes_avant_chaine', v_avant,
    'premier_rang', v_premier, 'dernier_rang', v_rang, 'rangs_manquants', v_trous + coalesce(v_premier - 1, 0),
    'intacte', v_rompue is null and v_trous = 0 and coalesce(v_premier, 1) = 1, 'rompue_au_rang', v_rompue,
    'empreinte', v_prec, 'verifie_le', now());
end $$;
revoke all on function private.filed_verifier_historique(uuid) from public, anon, authenticated;
grant execute on function private.filed_verifier_historique(uuid) to service_role;

create or replace function public.filed_verifier_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);   -- le serveur (service_role) passe aussi
  return private.filed_verifier_historique(p_client);
end $$;
comment on function public.filed_verifier_historique(uuid) is
  'Lot 38 (a4_46) : recalcule la chaîne de l''historique FILED de l''organisation : intacte, ou rompue (rang), rangs manquants. Gérant ou admin, ou service_role.';
revoke all on function public.filed_verifier_historique(uuid) from public, anon;
grant execute on function public.filed_verifier_historique(uuid) to authenticated, service_role;

create or replace function public.filed_sceau_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v jsonb;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);   -- le serveur (service_role) passe aussi
  select jsonb_build_object('client', p_client, 'rang', h.rang, 'empreinte', h.empreinte, 'le', now(),
           'texte', format('Historique FILED, rang %s, empreinte %s : notez-la hors d''Omega ; une vérification ultérieure qui la retrouve prouve qu''aucune ligne antérieure n''a été réécrite.', h.rang, h.empreinte))
    into v
    from public.filed_historique h where h.client_id = p_client and h.rang is not null order by h.rang desc limit 1;
  return coalesce(v, jsonb_build_object('client', p_client, 'rang', null, 'empreinte', null, 'le', now(),
                                        'texte', 'Aucune ligne chaînée pour l''instant.'));
end $$;
comment on function public.filed_sceau_historique(uuid) is
  'Lot 38 (a4_46) : le dernier rang de l''historique FILED et son empreinte, à noter hors d''Omega. Gérant ou admin, ou service_role.';
revoke all on function public.filed_sceau_historique(uuid) from public, anon;
grant execute on function public.filed_sceau_historique(uuid) to authenticated, service_role;
