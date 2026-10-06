-- b2_09b — Un gardien pour les pièces des contestations bancaires (session B2, 06/10/2026).
--
-- POURQUOI : le dossier de réponse est une pièce objet_type 'loc_contestations'. Sans gardien inscrit dans
-- private.gardiens_objets, private.voit_objet_pour la rend visible à tout membre de l'organisation (lu sur la recette par
-- le coordinateur), alors que la contestation elle-même n'est lisible que par son agence (RLS de loc_contestations).
-- Le gardien aligne la pièce sur la contestation : la direction (gérant, admin) la voit ; une autre personne la voit si
-- elle voit l'agence de la contestation. private.voit_entite lit auth.uid() : il ne répond que pour la personne connectée ;
-- interrogé pour quelqu'un d'autre, le gardien ne laisse passer que la direction (le refus est le cas sûr).
-- Rien n'est retiré ; l'inscription est faite une fois.

CREATE OR REPLACE FUNCTION private.loc_gardien_contestation(p_user uuid, p_client uuid, p_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_entite uuid;
begin
  if p_user is null or p_client is null or p_id is null or p_id !~ '^[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  select k.entite_id into v_entite from public.loc_contestations k where k.client_id = p_client and k.id = p_id::uuid;
  if not found then
    return false;
  end if;
  if exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client and c.role in ('gerant', 'admin')) then
    return true;
  end if;
  return p_user = (select auth.uid()) and private.voit_entite(p_client, v_entite);
end $function$;

revoke all on function private.loc_gardien_contestation(uuid, uuid, text) from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from private.gardiens_objets g where g.objet_type = 'loc_contestations') then
    insert into private.gardiens_objets (objet_type, module, voit, ecrit, lit, note)
    values ('loc_contestations', 'tavaro',
            'private.loc_gardien_contestation(uuid, uuid, text)'::regprocedure,
            'private.loc_gardien_contestation(uuid, uuid, text)'::regprocedure,
            'private.loc_gardien_contestation(uuid, uuid, text)'::regprocedure,
            'b2_09b : le dossier de réponse à une contestation bancaire reste à la direction et à l''agence de la contestation');
  end if;
end $$;
