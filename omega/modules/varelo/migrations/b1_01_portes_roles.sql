-- b1_01_portes_roles — VARELO : les quatre portes publiques qui n'exigeaient ni rôle ni appartenance
-- Session B1, 05/10/2026. Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production.
--
-- CE QUE ÇA CORRIGE (trou T1 de omega/NOTES-B1.md) :
--   public.grp_installer, grp_deposer_codes, grp_rapprocher et grp_appliquer_decisions sont de simples
--   enveloppes « language sql » vers des fonctions private SECURITY DEFINER qui, elles, ne regardent ni
--   auth.uid() ni le rôle de l'appelant (seules grp_demander_rapprochement et grp_exporter_referentiel
--   le font). Par défaut une fonction de public est exécutable par PUBLIC : toute personne connectée
--   pouvait installer Varelo chez n'importe quelle organisation, y déposer des codes, y lancer un passage.
--   Les crons et les ouvriers (auth.uid() nul) ne changent pas de comportement.
--
-- RÈGLE POSÉE : auth.uid() posé ⇒ membre de l'organisation avec le bon rôle, sinon 42501.
--   installer, déposer des codes : gérant ou administrateur (la DSI, qui branche les sources) ;
--   rapprocher, appliquer les décisions : gérant, administrateur ou valideur (comme demander_rapprochement).
-- Même signature, même type de retour : les appels existants ne changent pas. Pas de DROP.

create or replace function public.grp_installer(p_client uuid, p_equipe_referent text default 'referent_donnees'::text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''installation de Varelo revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  return private.grp_installer(p_client, p_equipe_referent);
end $function$;

create or replace function public.grp_deposer_codes(p_client uuid, p_entite uuid, p_nature text, p_lignes jsonb, p_source text default null::text)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le dépôt d''un export dans le référentiel revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  return private.grp_deposer_codes(p_client, p_entite, p_nature, p_lignes, p_source);
end $function$;

create or replace function public.grp_rapprocher(p_client uuid, p_complet boolean default false)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
    raise exception 'Un passage se lance par un gérant, un administrateur ou un valideur.' using errcode = '42501';
  end if;
  return private.grp_rapprocher(p_client, p_complet);
end $function$;

create or replace function public.grp_appliquer_decisions(p_client uuid)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
    raise exception 'Les décisions s''appliquent par un gérant, un administrateur ou un valideur.' using errcode = '42501';
  end if;
  return private.grp_executer_decisions(p_client);
end $function$;

-- anon n'a rien à faire sur ces portes ; authenticated et service_role gardent l'exécution.
revoke execute on function public.grp_installer(uuid, text) from anon;
revoke execute on function public.grp_deposer_codes(uuid, uuid, text, jsonb, text) from anon;
revoke execute on function public.grp_rapprocher(uuid, boolean) from anon;
revoke execute on function public.grp_appliquer_decisions(uuid) from anon;
