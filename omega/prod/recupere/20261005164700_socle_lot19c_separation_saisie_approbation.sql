-- recupere 20261005164700 socle_lot19c_separation_saisie_approbation
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 0ed55c79-c738-4170-9916-227abb7158aa (mcp__Supabase__execute_sql, 2026-10-05T16:49:30.292Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 19c : séparation saisie / approbation avant la décision (demande A4).
create or replace function private.preparer_approbation()
 returns trigger language plpgsql security definer set search_path to '' as $function$
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
  -- Lot 19c : celui qui a saisi ou corrigé la pièce (payload.saisi_par, tableau d'identifiants) ne l'approuve pas.
  if jsonb_typeof(v_d.payload -> 'saisi_par') = 'array'
     and (v_d.payload -> 'saisi_par' ? v_uid::text or v_d.payload -> 'saisi_par' ? v_decideur::text) then
    raise exception 'Celui qui a saisi la pièce ne l''approuve pas : une autre personne décide.' using errcode = '42501';
  end if;
  perform private.exiger_decideur(v_d, v_decideur);
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
  return new;
end $function$;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005164700', 'socle_lot19c_separation_saisie_approbation', array['-- preparer_approbation refuse un décideur présent dans payload.saisi_par']);
select 'lot19c ok' as r;
