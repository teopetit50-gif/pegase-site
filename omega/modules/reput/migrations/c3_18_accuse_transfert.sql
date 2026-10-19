-- c3_18 — REPUT : l'accusé de réception nomme le service qui reprend la demande (session C3, 19/10/2026)
--
-- Chiffrage #86 (« Elle est routée vers le service compétent selon les règles définies avec vous, et le client en est
-- informé. ») : la RÉPONSE nommait déjà le service (c3_09), mais l'ACCUSÉ — ce que le client reçoit dans la minute quand une
-- personne doit relire — restait le texte fixe des réglages. Désormais :
--   · reput_reglages.phrase_transfert (réglable par l'organisation et par site, comme le reste ; nulle = pas de phrase) :
--     « Votre demande est transmise au service {service}, qui revient vers vous. » par défaut ;
--   · private.reput_accuser (repris de c3_05) ajoute cette phrase au texte de l'accusé quand le sujet de la demande est
--     routé vers un service (c3_07), {service} remplacé par le nom de l'équipe ; sinon l'accusé ne change pas ;
--   · public.reput_regler (repris de c3_06) accepte la clé phrase_transfert ; l'héritage des sites (c3_17) la recopie.
-- L'accusé reste soumis à validation ou à l'accord « accusés », comme avant : rien ne part de plus.
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists phrase_transfert text
  default 'Votre demande est transmise au service {service}, qui revient vers vous.';
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_phrase_transfert_check') then
    alter table public.reput_reglages add constraint reput_reglages_phrase_transfert_check
      check (phrase_transfert is null or (char_length(btrim(phrase_transfert)) between 1 and 300 and phrase_transfert like '%{service}%'));
  end if;
end $do$;

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
  p_cible.phrase_transfert := p_source.phrase_transfert;
  return p_cible;
end $function$;

create or replace function private.reput_reglages_differents(a public.reput_reglages, b public.reput_reglages)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select (a.signature, a.formule_appel, a.formule_politesse, a.ton, a.mention_automatisee, a.langues, a.actif, a.accuse,
          a.texte_accuse, a.lien_avis, a.texte_avis, a.avis_auto_reglement, a.phrase_transfert)
         is distinct from
         (b.signature, b.formule_appel, b.formule_politesse, b.ton, b.mention_automatisee, b.langues, b.actif, b.accuse,
          b.texte_accuse, b.lien_avis, b.texte_avis, b.avis_auto_reglement, b.phrase_transfert)
$function$;

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
           phrase_transfert = x.phrase_transfert, maj_le = now()
    where r.id = x.id;
  end loop;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  return null;
end $function$;

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
         phrase_transfert = x.phrase_transfert, suit_organisation = true, maj_par = v_uid, maj_le = now()
  where r.id = x.id;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_suivent_organisation', 'reput_reglages', x.id::text,
    jsonb_build_object('entite', p_entite, 'par', v_uid), p_entite);
  return jsonb_build_object('entite', p_entite, 'suit_organisation', true);
end $function$;

create or replace function public.reput_regler(p_client uuid, p_entite uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_cle text;
  v_r public.reput_reglages;
  v_langues text[];
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_reglages is null or jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Les réglages forment un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(p_reglages) loop
    if v_cle not in ('signature', 'formule_appel', 'formule_politesse', 'ton', 'mention_automatisee', 'langues', 'actif',
                     'accuse', 'texte_accuse', 'lien_avis', 'texte_avis', 'avis_auto_reglement', 'phrase_transfert') then
      raise exception 'Réglage inconnu : « % » (signature, formule_appel, formule_politesse, ton, mention_automatisee, langues, actif, accuse, texte_accuse, lien_avis, texte_avis, avis_auto_reglement, phrase_transfert).', v_cle
        using errcode = '22023';
    end if;
  end loop;
  perform private.reput_installer(p_client, p_entite);
  select * into v_r from public.reput_reglages r where r.client_id = p_client and r.entite_id is not distinct from p_entite for update;
  if p_reglages ? 'langues' then
    if jsonb_typeof(p_reglages -> 'langues') <> 'array' then
      raise exception 'Les langues forment une liste de codes à deux lettres (fr, en, es…).' using errcode = '22023';
    end if;
    select array_agg(lower(btrim(x)) order by o) into v_langues
    from jsonb_array_elements_text(p_reglages -> 'langues') with ordinality t(x, o);
  end if;
  update public.reput_reglages r set
    signature = case when p_reglages ? 'signature' then btrim(p_reglages ->> 'signature') else r.signature end,
    formule_appel = case when p_reglages ? 'formule_appel' then coalesce(p_reglages ->> 'formule_appel', '') else r.formule_appel end,
    formule_politesse = case when p_reglages ? 'formule_politesse' then coalesce(p_reglages ->> 'formule_politesse', '') else r.formule_politesse end,
    ton = case when p_reglages ? 'ton' then p_reglages ->> 'ton' else r.ton end,
    mention_automatisee = case when p_reglages ? 'mention_automatisee' then nullif(btrim(p_reglages ->> 'mention_automatisee'), '') else r.mention_automatisee end,
    langues = coalesce(v_langues, r.langues),
    actif = case when p_reglages ? 'actif' then (p_reglages ->> 'actif')::boolean else r.actif end,
    accuse = case when p_reglages ? 'accuse' then (p_reglages ->> 'accuse')::boolean else r.accuse end,
    texte_accuse = case when p_reglages ? 'texte_accuse' then btrim(p_reglages ->> 'texte_accuse') else r.texte_accuse end,
    lien_avis = case when p_reglages ? 'lien_avis' then nullif(btrim(p_reglages ->> 'lien_avis'), '') else r.lien_avis end,
    texte_avis = case when p_reglages ? 'texte_avis' then btrim(p_reglages ->> 'texte_avis') else r.texte_avis end,
    avis_auto_reglement = case when p_reglages ? 'avis_auto_reglement' then (p_reglages ->> 'avis_auto_reglement')::boolean else r.avis_auto_reglement end,
    phrase_transfert = case when p_reglages ? 'phrase_transfert' then nullif(btrim(p_reglages ->> 'phrase_transfert'), '') else r.phrase_transfert end,
    maj_par = v_uid, maj_le = now()
  where r.id = v_r.id
  returning * into v_r;
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_modifies', 'reput_reglages', v_r.id::text,
    jsonb_build_object('cles', (select jsonb_agg(k order by k) from jsonb_object_keys(p_reglages) k)), p_entite);
  return to_jsonb(v_r);
end $function$;

create or replace function private.reput_accuser(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  g public.reput_reglages;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_service text;
  v_phrase text;
begin
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null or d.accuse_le is not null or d.statut not in ('a_valider', 'a_traiter') or d.canal_reponse is null then
    return jsonb_build_object('ignore', 'demande absente, déjà accusée, déjà répondue ou sans adresse');
  end if;
  select * into g from public.reput_reglages r
  where r.client_id = d.client_id and (r.entite_id = d.entite_id or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or not g.accuse then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;   -- rien à accuser : ne plus y revenir
    return jsonb_build_object('ignore', 'accusé désactivé dans les réglages');
  end if;
  if coalesce(d.langue, 'fr') <> 'fr' then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;
    return jsonb_build_object('ignore', 'accusé écrit en français, demande en ' || d.langue);
  end if;
  -- c3_18 : un sujet routé vers un service → l'accusé le dit, en le nommant (« le client en est informé »).
  select e.nom into v_service
  from public.reput_sujets s join public.equipes e on e.client_id = s.client_id and e.id = s.equipe_id
  where s.client_id = d.client_id and s.code = d.sujet;
  if v_service is not null and g.phrase_transfert is not null then
    v_phrase := replace(btrim(g.phrase_transfert), '{service}', btrim(v_service));
  end if;
  v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''), concat_ws(' ', btrim(g.texte_accuse), v_phrase),
                       concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
                       nullif(btrim(g.mention_automatisee), ''));
  v_objet := case when d.canal_reponse = 'email' then left('Re : ' || coalesce(nullif(btrim(d.objet), ''), 'votre message'), 300) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (d.client_id, d.entite_id, 'reput', 'reput.accuser', 'reput_demandes', d.id::text,
          left('Accusé de réception à ' || coalesce(nullif(btrim(d.de_nom), ''), d.adresse_reponse), 500),
          jsonb_build_object('demande', d.id, 'canal', d.canal_reponse, 'objet', v_objet, 'corps', v_corps),
          now() + interval '2 days', 'reput:accuse:' || d.id::text)
  returning id into v_dv;
  v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
    jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', 'fr', 'professionnel', false),
    null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:accuse:' || d.id::text, d.entite_id,
    true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_demandes x set accuse_envoi = v_envoi, accuse_le = now(), maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_prepare', 'reput_demandes', d.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv,
                       'service_nomme', v_phrase is not null), d.entite_id);
  return jsonb_build_object('demande', d.id, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'demande_validation', v_dv);
end $function$;
