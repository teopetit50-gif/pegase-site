-- b4_03 — Tamila : l'enveloppe de la clé d'un dossier, rendue à qui voit le dossier (session B4, 05/10/2026).
--
-- CE QUE ÇA CORRIGE. tamila_cles n'a qu'une politique : « les associés lisent l'état des clés ».
-- Or le chiffrement se fait dans le navigateur (components/espace/tamila/chiffrement.ts) : référence,
-- intitulé, n° RG et noms des parties ne se lisent qu'avec la clé du dossier, enveloppée sous la
-- phrase du cabinet (fournisseur « local »). Un avocat collaborateur (valideur) membre du dossier, ou
-- un intervenant, ne peut donc pas lire ce qu'il a le droit de voir : pour lui, l'écran reste
-- « Chiffré ». La politique de tamila_cles reste ce qu'elle est (l'état des clés, c'est l'affaire des
-- associés) ; ce qui manque est une porte qui rend L'ENVELOPPE, et elle seule, à un membre du dossier.
--
-- CE QUE ÇA POSE. public.tamila_cle_dossier(p_dossier) → bytea : l'enveloppe de la clé active du
-- dossier, à une personne connectée qui voit le dossier (private.tamila_voit_dossier_pour : membre
-- actif, titulaire perso, associé non muré). Hors de l'enveloppe, rien : ni la référence du coffre, ni
-- les dates. La remise est tracée comme une lecture (contexte « cle ») : elle apparaît au journal des
-- accès. Un dossier dont la clé est désactivée ou détruite ne rend rien (null) : son contenu est en
-- cours d'effacement. Rien n'est effacé, rien n'est modifié : create or replace seulement.

create or replace function private.tamila_cle_dossier(p_dossier uuid)
returns bytea
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_env bytea;
begin
  if v_uid is null then
    raise exception 'La clé d''un dossier se remet à une personne connectée.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit', 'clos') then
    raise exception 'Ce dossier n''a plus de contenu.' using errcode = '55000';
  end if;
  select k.enveloppe into v_env from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active';
  if v_env is null then
    return null;
  end if;
  perform private.tracer_lecture(v_d.client_id, 'tamila_dossier', p_dossier::text, 'cle');
  return v_env;
end $function$;

create or replace function public.tamila_cle_dossier(p_dossier uuid)
returns bytea
language sql
set search_path to ''
as $function$ select private.tamila_cle_dossier(p_dossier) $function$;

comment on function public.tamila_cle_dossier(uuid) is
  'Tamila (B4) : l''enveloppe de la clé active d''un dossier, à un membre qui le voit ; la remise est tracée (contexte cle).';

grant execute on function public.tamila_cle_dossier(uuid) to authenticated;
grant execute on function private.tamila_cle_dossier(uuid) to authenticated;
revoke execute on function public.tamila_cle_dossier(uuid) from anon;
