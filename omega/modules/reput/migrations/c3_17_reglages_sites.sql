-- c3_17 — REPUT : les réglages par entité et par site (session C3, 19/10/2026)
--
-- Chiffrage #56 (« Le ton, la signature et les formules se règlent entité par entité. ») et #88 (« Chaque société, site ou
-- service a sa base de connaissances, ses horaires et sa signature… un responsable de site ne voit que le sien »).
-- Déjà là : une ligne reput_reglages par entité (entite_id), que la base en vigueur, l'accusé et l'avis préfèrent à celle
-- de l'organisation ; des fiches par entité ; la lecture des demandes au périmètre. Manquait :
--   · L'HÉRITAGE. Une entité sans réglages propres SUIT l'organisation (reput_reglages.suit_organisation) : sa ligne est
--     la copie de celle de l'organisation, tenue à jour à chaque changement de l'organisation. Dès qu'on règle l'entité
--     elle-même, elle a ses PROPRES réglages et ne suit plus ; public.reput_suivre_organisation(p_client, p_entite) l'y
--     ramène. Les lecteurs existants (reput_base, reput_accuser, l'avis) n'ont pas à changer : ils lisent la ligne de
--     l'entité, qui porte toujours les bons réglages.
--   · LE PÉRIMÈTRE. Un gérant ou un administrateur ne règle une entité que si son périmètre la couvre ; les réglages de
--     toute l'organisation demandent un périmètre complet. Un administrateur de site règle donc son site, pas les autres.
--   · LA LECTURE. public.reput_reglages_sites (security_invoker) : par entité, d'où viennent ses réglages (organisation
--     ou propres) et ce qu'ils disent ; chacun ne lit que son périmètre (RLS de reput_reglages et des entités).
-- L'envoi automatique (c3_13) reste un réglage de l'organisation.
--
-- Règles de pose : alter … if not exists, create or replace, triggers recréés sous garde ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists suit_organisation boolean not null default false;

-- Les champs que l'entité hérite de l'organisation.
create or replace function private.reput_copier_reglages(p_cible public.reput_reglages, p_source public.reput_reglages)
 returns public.reput_reglages
 language plpgsql
 immutable
 set search_path to ''
as $function$
begin
  p_cible.signature := p_source.signature;
  p_cible.formule_appel := p_source.formule_appel;
  p_cible.formule_politesse := p_source.formule_politesse;
  p_cible.ton := p_source.ton;
  p_cible.mention_automatisee := p_source.mention_automatisee;
  p_cible.langues := p_source.langues;
  p_cible.actif := p_source.actif;
  p_cible.accuse := p_source.accuse;
  p_cible.texte_accuse := p_source.texte_accuse;
  p_cible.lien_avis := p_source.lien_avis;
  p_cible.texte_avis := p_source.texte_avis;
  p_cible.avis_auto_reglement := p_source.avis_auto_reglement;
  return p_cible;
end $function$;

revoke execute on function private.reput_copier_reglages(public.reput_reglages, public.reput_reglages) from public, anon, authenticated;

create or replace function private.reput_reglages_differents(a public.reput_reglages, b public.reput_reglages)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select (a.signature, a.formule_appel, a.formule_politesse, a.ton, a.mention_automatisee, a.langues, a.actif, a.accuse,
          a.texte_accuse, a.lien_avis, a.texte_avis, a.avis_auto_reglement)
         is distinct from
         (b.signature, b.formule_appel, b.formule_politesse, b.ton, b.mention_automatisee, b.langues, b.actif, b.accuse,
          b.texte_accuse, b.lien_avis, b.texte_avis, b.avis_auto_reglement)
$function$;

revoke execute on function private.reput_reglages_differents(public.reput_reglages, public.reput_reglages) from public, anon, authenticated;

-- Une entité qui s'installe hérite de l'organisation.
create or replace function private.reput_reglages_naissance()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare o public.reput_reglages;
begin
  if new.entite_id is not null then
    select * into o from public.reput_reglages r where r.client_id = new.client_id and r.entite_id is null;
    if o.id is not null then
      new := private.reput_copier_reglages(new, o);
      new.suit_organisation := true;
    end if;
  end if;
  return new;
end $function$;

revoke execute on function private.reput_reglages_naissance() from public, anon, authenticated;

-- Un changement : le périmètre de qui le fait ; une entité réglée elle-même ne suit plus l'organisation.
create or replace function private.reput_reglages_garde()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if coalesce(current_setting('reput.propagation', true), '') = '1' then
    return new;
  end if;
  if not private.reput_reglages_differents(new, old) then
    return new;
  end if;
  if v_uid is not null then
    if new.entite_id is null then
      if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = new.client_id and c.perimetre_total) then
        raise exception 'Les réglages de toute l''organisation se changent avec un périmètre complet.' using errcode = '42501';
      end if;
    elsif not private.perimetre_couvre(v_uid, new.client_id, new.entite_id) then
      raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if new.entite_id is not null then
    new.suit_organisation := false;
  end if;
  return new;
end $function$;

revoke execute on function private.reput_reglages_garde() from public, anon, authenticated;

-- L'organisation change : les entités qui la suivent suivent.
create or replace function private.reput_reglages_propager()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_avant text := current_setting('reput.propagation', true);
  x public.reput_reglages;
begin
  if new.entite_id is not null or not private.reput_reglages_differents(new, old) then
    return null;
  end if;
  perform set_config('reput.propagation', '1', true);
  for x in select * from public.reput_reglages r where r.client_id = new.client_id and r.entite_id is not null and r.suit_organisation for update loop
    x := private.reput_copier_reglages(x, new);
    update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
           ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
           texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
           maj_le = now()
    where r.id = x.id;
  end loop;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  return null;
end $function$;

revoke execute on function private.reput_reglages_propager() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_naissance' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_naissance before insert on public.reput_reglages
      for each row execute function private.reput_reglages_naissance();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_garde' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_garde before update on public.reput_reglages
      for each row execute function private.reput_reglages_garde();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_propager' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_propager after update on public.reput_reglages
      for each row execute function private.reput_reglages_propager();
  end if;
end $do$;

-- Ramener une entité aux réglages de l'organisation.
create or replace function public.reput_suivre_organisation(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant text := current_setting('reput.propagation', true);
  o public.reput_reglages;
  x public.reput_reglages;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null or not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  perform private.reput_installer(p_client, null);
  perform private.reput_installer(p_client, p_entite);
  select * into o from public.reput_reglages r where r.client_id = p_client and r.entite_id is null;
  select * into x from public.reput_reglages r where r.client_id = p_client and r.entite_id = p_entite for update;
  x := private.reput_copier_reglages(x, o);
  perform set_config('reput.propagation', '1', true);
  update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
         ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
         texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
         suit_organisation = true, maj_par = v_uid, maj_le = now()
  where r.id = x.id;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_suivent_organisation', 'reput_reglages', x.id::text,
    jsonb_build_object('entite', p_entite, 'par', v_uid), p_entite);
  return jsonb_build_object('entite', p_entite, 'suit_organisation', true);
end $function$;

revoke execute on function public.reput_suivre_organisation(uuid, uuid) from public, anon;
grant execute on function public.reput_suivre_organisation(uuid, uuid) to authenticated, service_role;

-- Par entité : d'où viennent ses réglages et ce qu'ils disent (une entité sans ligne suit l'organisation).
create or replace view public.reput_reglages_sites with (security_invoker = true) as
select e.client_id, e.id as entite_id, e.nom, e.type, e.principale,
       case when r.id is null or r.suit_organisation then 'organisation' else 'propres' end as source,
       coalesce(r.signature, o.signature) as signature, coalesce(r.ton, o.ton) as ton,
       coalesce(r.formule_appel, o.formule_appel) as formule_appel, coalesce(r.formule_politesse, o.formule_politesse) as formule_politesse,
       coalesce(r.langues, o.langues) as langues, coalesce(r.actif, o.actif) as actif, coalesce(r.accuse, o.accuse) as accuse,
       coalesce(r.maj_le, o.maj_le) as maj_le
from public.entites e
join public.reput_reglages o on o.client_id = e.client_id and o.entite_id is null
left join public.reput_reglages r on r.client_id = e.client_id and r.entite_id = e.id;

revoke all on public.reput_reglages_sites from public, anon, authenticated;
grant select on public.reput_reglages_sites to authenticated, service_role;
