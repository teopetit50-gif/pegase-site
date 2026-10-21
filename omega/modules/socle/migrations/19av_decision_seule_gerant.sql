-- 19av_decision_seule_gerant.sql — une seule personne suffit quand elle est gérante (ou d'un rôle que l'organisation
-- désigne). A5, 21/10/2026, décision de Teo : « pas besoin de garder la règle des deux personnes ».
--
-- Avant : le demandeur ne décidait jamais de sa propre demande (42501), sauf l'exception étroite de 19af (gérant seul
-- décideur, accords de la liste blanche) ; celui qui avait saisi une pièce ne l'approuvait pas (19c).
-- Désormais, ces deux règles ne s'appliquent pas à qui décide EN SON NOM (pas de délégation) et tient, dans
-- l'organisation, un rôle de private.roles_decision_seule(client) : « gerant » par défaut, ou la liste que le gérant
-- règle par public.regler_decision_seule (gerant, admin, valideur). Le reste du contrôle est inchangé : rôles autorisés
-- de la demande (exiger_decideur), périmètre, accès à l'objet, échéance. L'approbation garde la trace
-- « [seul décideur] » en tête de son commentaire, et le journal la reçoit comme toute approbation. Une organisation
-- qui veut deux personnes le règle par un seuil (regles_validation.approbations_requises = 2).
--
-- Pose : le corps de private.preparer_approbation est réécrit à partir de la définition en base, par deux repères qui
-- doivent s'y trouver chacun exactement une fois ; sinon le lot s'arrête sans rien changer. Rejouable : un corps qui
-- porte déjà private.decide_seul n'est pas retouché. Rien n'est supprimé.

create or replace function private.roles_decision_seule(p_client uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce((select array_agg(r order by r) from public.clients c,
                          jsonb_array_elements_text(case when jsonb_typeof(c.config -> 'decision_seule_roles') = 'array'
                                                         then c.config -> 'decision_seule_roles' else '[]'::jsonb end) r
                   where c.id = p_client and r in ('gerant', 'admin', 'valideur')),
                  array['gerant'])
$$;

-- La personne p_uid, décidant en son nom (p_au_nom_de vide), peut-elle décider seule de la demande p_d ?
create or replace function private.decide_seul(p_d public.demandes_validation, p_au_nom_de uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_au_nom_de is null and p_uid is not null
     and exists (select 1 from public.comptes c
                 where c.client_id = p_d.client_id and c.user_id = p_uid
                   and c.role = any (private.roles_decision_seule(p_d.client_id)))
$$;

create or replace function public.regler_decision_seule(p_client uuid, p_roles text[]) returns text[]
language plpgsql security definer set search_path = '' as $$
declare v_roles text[];
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant désigne qui peut décider seul.' using errcode = '42501';
  end if;
  select array_agg(distinct r order by r) into v_roles from unnest(coalesce(p_roles, '{}')) r;
  if v_roles is null or not (v_roles <@ array['gerant', 'admin', 'valideur']) then
    raise exception 'Rôles permis : gerant, admin, valideur.' using errcode = '22023';
  end if;
  update public.clients set config = jsonb_set(coalesce(config, '{}'::jsonb), '{decision_seule_roles}', to_jsonb(v_roles))
   where id = p_client;
  if not found then raise exception 'Organisation introuvable.' using errcode = 'P0002'; end if;
  perform private.journaliser(p_client, 'validation.decision_seule_reglee', 'client', p_client::text,
                              jsonb_build_object('roles', v_roles), null::uuid);
  return v_roles;
end $$;

do $$ declare f text; begin
  foreach f in array array['private.roles_decision_seule(uuid)',
                           'private.decide_seul(public.demandes_validation, uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  execute 'revoke all on function public.regler_decision_seule(uuid, text[]) from public, anon';
  execute 'grant execute on function public.regler_decision_seule(uuid, text[]) to authenticated, service_role';
end $$;

-- preparer_approbation : les deux règles reçoivent l'exception ; le reste du corps est inchangé.
do $lot$
declare
  d text; n integer;
  -- Repère 1 (posé par 19af) : l'exception du demandeur.
  m1 constant text := 'if private\.activation_par_seul_decideur\(v_d, new\.au_nom_de, v_uid\) then';
  r1 constant text := 'if private.activation_par_seul_decideur(v_d, new.au_nom_de, v_uid)'
                   || ' or private.decide_seul(v_d, new.au_nom_de, v_uid) then  -- 19av';
  -- Repère 2 (posé par 19c) : celui qui a saisi la pièce.
  m2 constant text := 'if jsonb_typeof\(v_d\.payload -> ''saisi_par''\) = ''array''';
  r2 constant text :=
       '-- Lot 19av : qui décide seul (gérant, ou rôle désigné) approuve aussi ce qu''il a saisi ; c''est marqué.' || chr(10)
    || '  if private.decide_seul(v_d, new.au_nom_de, v_uid)' || chr(10)
    || '     and jsonb_typeof(v_d.payload -> ''saisi_par'') = ''array'' and v_d.payload -> ''saisi_par'' ? v_uid::text' || chr(10)
    || '     and coalesce(new.commentaire, '''') not like ''[seul décideur]%'' then' || chr(10)
    || '    new.commentaire := left(''[seul décideur] '' || coalesce(new.commentaire, ''''), 2000);' || chr(10)
    || '  end if;' || chr(10)
    || '  if not private.decide_seul(v_d, new.au_nom_de, v_uid) and jsonb_typeof(v_d.payload -> ''saisi_par'') = ''array''';
begin
  select pg_get_functiondef('private.preparer_approbation()'::regprocedure) into d;
  if position('private.decide_seul' in d) > 0 then
    raise notice 'Lot 19av : preparer_approbation porte déjà l''exception, corps inchangé.';
    return;
  end if;
  select count(*) into n from regexp_matches(d, m1, 'g');
  if n <> 1 then
    raise exception 'Lot 19av, preparer_approbation : repère de 19af trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  select count(*) into n from regexp_matches(d, m2, 'g');
  if n <> 1 then
    raise exception 'Lot 19av, preparer_approbation : repère de 19c (saisi_par) trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  d := regexp_replace(d, m1, r1);
  d := regexp_replace(d, m2, r2);
  execute d;
end $lot$;
