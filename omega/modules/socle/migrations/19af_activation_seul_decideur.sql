-- 19af_activation_seul_decideur — socle : un gérant SEUL décideur active lui-même un accord permanent de la liste blanche.
-- A5, 06/10/2026, décision de Teo (« entre-deux »), demandé par le coordinateur. Pose : recette ygwbgpowzlbdaajlsqkn.
--
-- Le socle refuse qu'un demandeur décide de sa propre demande (preparer_approbation, 42501) : c'est juste, et ça
-- le reste. Une seule exception, étroite, pour l'organisation où le gérant est le seul à pouvoir décider (aucun
-- autre gérant, administrateur ni valideur actif) : il active lui-même un accord permanent (politique.activer)
-- dont le couple (module, type_action) figure dans private.activation_seul_autorisee. Ce lot n'en autorise que
-- trois : les confirmations J-2 de Daliro (envoi.email, envoi.whatsapp, envoi.sms, lot b6_08).
-- L'exception s'applique seulement si, en même temps :
--   · la demande est de type politique.activer, sur l'objet politique, et cette politique est en liste blanche ;
--   · la personne décide en son nom (au_nom_de vide : pas de délégation) ;
--   · private.seul_decideur(client, personne) est vrai.
-- Dans ce cas, l'approbation passe, et son commentaire commence par « [seul décideur] » (trace lisible au journal
-- et à l'écran). Tout le reste du contrôle s'applique comme avant : 19c (saisi_par), exiger_decideur (rôles
-- autorisés de la demande : gérant pour politique.activer), périmètre, équipe, accès à l'objet.
--
-- Pose : rien n'est supprimé. Le corps de preparer_approbation est réécrit à partir de la définition en base, par un repère
-- qui doit s'y trouver exactement une fois ; sinon le lot s'arrête sans rien changer. Rejouable : si le corps
-- porte déjà l'exception, il n'est pas retouché. Nouvelles fonctions sans EXECUTE pour public, anon, authenticated.

-- 1. La liste blanche (lue par le socle seul).
create table if not exists private.activation_seul_autorisee (
  module text not null,
  type_action text not null,
  note text,
  primary key (module, type_action),
  constraint activation_seul_autorisee_module_check check (module ~ '^[a-z][a-z_]{1,29}$'),
  constraint activation_seul_autorisee_type_check check (char_length(type_action) between 1 and 80 and type_action <> 'politique.activer')
);
revoke all on table private.activation_seul_autorisee from public, anon, authenticated;
grant select on table private.activation_seul_autorisee to service_role;

insert into private.activation_seul_autorisee (module, type_action, note) values
  ('daliro', 'envoi.email', 'Accord permanent des confirmations J-2 (courriel), b6_08 ; décision de Teo du 06/10/2026'),
  ('daliro', 'envoi.whatsapp', 'Accord permanent des confirmations J-2 (WhatsApp), b6_08 ; décision de Teo du 06/10/2026'),
  ('daliro', 'envoi.sms', 'Accord permanent des confirmations J-2 (SMS), b6_08 ; décision de Teo du 06/10/2026')
on conflict (module, type_action) do nothing;

-- 2. Le gérant (ou administrateur) est-il le seul à pouvoir décider dans son organisation ?
--    Vrai si p_user a le rôle gérant ou admin chez p_client, et qu'aucun AUTRE compte actif du client n'a le rôle
--    gérant, admin ou valideur. « Actif » : l'utilisateur existe dans auth.users, n'est pas supprimé
--    (deleted_at) ni banni à cet instant (banned_until).
create or replace function private.seul_decideur(p_client uuid, p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select p_client is not null and p_user is not null
     and exists (select 1 from public.comptes c
                 where c.client_id = p_client and c.user_id = p_user and c.role in ('gerant', 'admin'))
     and not exists (select 1 from public.comptes c
                     join auth.users u on u.id = c.user_id
                     where c.client_id = p_client and c.user_id <> p_user
                       and c.role in ('gerant', 'admin', 'valideur')
                       and u.deleted_at is null
                       and (u.banned_until is null or u.banned_until <= now()))
$function$;
revoke execute on function private.seul_decideur(uuid, uuid) from public, anon, authenticated;
grant execute on function private.seul_decideur(uuid, uuid) to service_role;

-- 3. L'exception, en une fonction (lisible et testable) : la demande p_d peut-elle être approuvée par son propre
--    demandeur p_uid, décidant en son nom (p_au_nom_de vide) ?
create or replace function private.activation_par_seul_decideur(p_d public.demandes_validation, p_au_nom_de uuid, p_uid uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select p_au_nom_de is null
     and p_d.type_action = 'politique.activer'
     and p_d.objet_type = 'politique'
     and p_d.objet_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists (select 1 from public.politiques p
                 join private.activation_seul_autorisee a on a.module = p.module and a.type_action = p.type_action
                 where p.id = p_d.objet_id::uuid and p.client_id = p_d.client_id)
     and private.seul_decideur(p_d.client_id, p_uid)
$function$;
revoke execute on function private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid) from public, anon, authenticated;
grant execute on function private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid) to service_role;

-- 4. preparer_approbation : la règle du demandeur reçoit l'exception, le reste du corps est inchangé.
do $lot$
declare
  d text;
  motif constant text := 'if v_d\.demandeur_id is not null and \(v_uid = v_d\.demandeur_id or v_decideur = v_d\.demandeur_id\) then\s+'
                       || 'raise exception ''Le demandeur ne décide pas de sa propre demande\.'' using errcode = ''42501'';\s+'
                       || 'end if;';
  par constant text :=
       'if v_d.demandeur_id is not null and (v_uid = v_d.demandeur_id or v_decideur = v_d.demandeur_id) then' || chr(10)
    || '    -- Lot 19af : un gérant seul décideur active lui-même un accord permanent de la liste blanche.' || chr(10)
    || '    if private.activation_par_seul_decideur(v_d, new.au_nom_de, v_uid) then' || chr(10)
    || '      new.commentaire := case when coalesce(new.commentaire, '''') like ''[seul décideur]%'' then new.commentaire' || chr(10)
    || '                              else left(''[seul décideur] '' || coalesce(new.commentaire, ''''), 2000) end;' || chr(10)
    || '    else' || chr(10)
    || '      raise exception ''Le demandeur ne décide pas de sa propre demande.'' using errcode = ''42501'';' || chr(10)
    || '    end if;' || chr(10)
    || '  end if;';
  n integer;
begin
  select pg_get_functiondef('private.preparer_approbation()'::regprocedure) into d;
  if position('private.activation_par_seul_decideur' in d) > 0 then
    raise notice 'Lot 19af : preparer_approbation porte déjà l''exception, corps inchangé.';
    return;
  end if;
  select count(*) into n from regexp_matches(d, motif, 'g');
  if n <> 1 then
    raise exception 'Lot 19af, preparer_approbation : repère de la règle du demandeur trouvé % fois (1 attendu) ; rien n''est changé.', n;
  end if;
  d := regexp_replace(d, motif, par);
  execute d;
end $lot$;
