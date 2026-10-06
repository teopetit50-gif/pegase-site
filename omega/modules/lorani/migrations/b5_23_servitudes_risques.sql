-- LORANI, lot B5-23 — les servitudes d'utilité publique et les risques, lus depuis l'adresse avec le PLU (b5_17).
--
-- Pourquoi : la page des architectes promet « PLU, servitudes et risques lus depuis l'adresse ». b5_17 lit la zone, le
-- document d'urbanisme et le règlement ; il manquait les servitudes (abords de monument historique, site, plan de
-- prévention des risques…) et les risques connus (commune, sismicité, retrait-gonflement des argiles, radon).
--
-- Les sources (publiques, sans clé), appelées par la base (pg_net) dès que le point ou la parcelle est connu :
--   · servitudes : API Carto de l'IGN, Géoportail de l'urbanisme — https://apicarto.ign.fr/api/gpu/assiette-sup-s, -l, -p
--     (geom) : catégorie (suptype : ac1 monuments historiques, ac2 sites, ac4 sites patrimoniaux remarquables, pm1 plan
--     de prévention des risques naturels, pm3 risques technologiques, as1 captages, i4 lignes électriques, t5
--     servitudes aéronautiques…), nom de la servitude, type d'assiette, acte. Une réponse surfacique peut peser
--     plusieurs mégaoctets et mettre vingt secondes : délai de 60 s ;
--   · risques : Géorisques (BRGM / ministère), https://georisques.gouv.fr/api/v1 — gaspar/risques?code_insee (risques
--     recensés dans la commune), zonage_sismique?code_insee, radon?code_insee, rga?latlon (exposition au retrait-
--     gonflement des argiles, à l'adresse). Le rapport complet par adresse (resultats_rapport_risque) n'est PAS
--     utilisé : il est réputé instable. Les réponses sont lues de façon tolérante (le champ est cherché à toute
--     profondeur : libelle_risque_long, zone_sismicite / code_zone, classe_potentiel, exposition / codeExposition).
--
-- Ce qui est posé :
--   · lorani_plu : servitudes [{categorie, libelle_categorie, nom, assiette, acte}], risques {commune: […], sismicite,
--     radon, argiles, erreurs: […]}, secteur_protege (abords MH, site, SPR), complements (demandes en cours),
--     complements_statut a_faire | en_cours | fait | partiel, complements_le.
--   · Trigger : quand lorani_plu reçoit sa géométrie (b5_17), les sept demandes partent ensemble ; une nouvelle
--     recherche les relance.
--   · private.lorani_plu_complement_poser(projet, etape, statut_http, contenu) : applique une réponse (testable sans
--     réseau) ; un service en panne n'arrête rien : il est noté dans risques.erreurs, le statut finit « partiel ».
--   · private.lorani_plu_complements_avancer(projet) : relève net._http_response ; une demande sans réponse après
--     5 minutes est notée en panne.
--   · Quand tout est revenu : alerte au chef de projet si le terrain est en secteur protégé (avis de l'architecte des
--     Bâtiments de France, délai d'instruction majoré, C. urb. art. R423-24) ou sous un plan de prévention des risques
--     (règlement du PPR opposable, C. env. art. L562-4) ; journal lorani.servitudes_risques.
--   · public.lorani_suivre_plu (corps de b5_17) relève aussi les compléments ; private.lorani_lectures_passage()
--     (corps de b5_21) aussi.
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS servitudes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS risques jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS secteur_protege boolean;
ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS complements jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS complements_statut text NOT NULL DEFAULT 'a_faire';
ALTER TABLE public.lorani_plu ADD COLUMN IF NOT EXISTS complements_le timestamptz;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_plu_complements_statut_check') then
    alter table public.lorani_plu add constraint lorani_plu_complements_statut_check
      CHECK (complements_statut = ANY (ARRAY['a_faire', 'en_cours', 'fait', 'partiel']));
  end if;
end $$;

-- Un appel avec son délai (les servitudes surfaciques sont lourdes).
CREATE OR REPLACE FUNCTION private.lorani_http_get(p_url text, p_params jsonb, p_delai_ms integer)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select net.http_get(url := p_url, params := p_params, headers := '{"Accept": "application/json"}'::jsonb, timeout_milliseconds := p_delai_ms)
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_http_get(text, jsonb, integer) FROM PUBLIC;

-- Le libellé d'une catégorie de servitude.
CREATE OR REPLACE FUNCTION private.lorani_categorie_sup(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case lower(p)
    when 'ac1' then 'Abords de monument historique'
    when 'ac2' then 'Site inscrit ou classé'
    when 'ac3' then 'Réserve naturelle'
    when 'ac4' then 'Site patrimonial remarquable'
    when 'as1' then 'Protection d''un captage d''eau potable'
    when 'el3' then 'Halage et marchepied'
    when 'el7' then 'Alignement des voies publiques'
    when 'i1' then 'Canalisation d''hydrocarbures'
    when 'i3' then 'Canalisation de gaz'
    when 'i4' then 'Ligne électrique'
    when 'int1' then 'Voisinage d''un cimetière'
    when 'pm1' then 'Plan de prévention des risques naturels'
    when 'pm2' then 'Installation classée (servitude)'
    when 'pm3' then 'Plan de prévention des risques technologiques'
    when 'pt1' then 'Protection des transmissions radioélectriques'
    when 'pt2' then 'Obstacles aux transmissions radioélectriques'
    when 't1' then 'Voie ferrée'
    when 't4' then 'Balisage aéronautique'
    when 't5' then 'Dégagement aéronautique'
    when 't7' then 'Servitude aéronautique hors dégagement'
    else 'Servitude ' || upper(coalesce(p, '?'))
  end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_categorie_sup(text) FROM PUBLIC;

-- Les sept demandes, parties ensemble.
CREATE OR REPLACE FUNCTION private.lorani_plu_complements_lancer(p_plu uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  pr public.lorani_projets;
  g text;
  v jsonb := '{}'::jsonb;
  b text := 'https://georisques.gouv.fr/api/v1/';
begin
  select * into l from public.lorani_plu where id = p_plu;
  select * into pr from public.lorani_projets where id = l.projet_id;
  if l.geom is null then
    return;
  end if;
  g := l.geom::text;
  v := v || jsonb_build_object('sup_s', private.lorani_http_get('https://apicarto.ign.fr/api/gpu/assiette-sup-s', jsonb_build_object('geom', g), 60000),
                               'sup_l', private.lorani_http_get('https://apicarto.ign.fr/api/gpu/assiette-sup-l', jsonb_build_object('geom', g), 20000),
                               'sup_p', private.lorani_http_get('https://apicarto.ign.fr/api/gpu/assiette-sup-p', jsonb_build_object('geom', g), 20000));
  if pr.code_insee is not null then
    v := v || jsonb_build_object('gaspar', private.lorani_http_get(b || 'gaspar/risques', jsonb_build_object('code_insee', pr.code_insee), 20000),
                                 'sismique', private.lorani_http_get(b || 'zonage_sismique', jsonb_build_object('code_insee', pr.code_insee), 20000),
                                 'radon', private.lorani_http_get(b || 'radon', jsonb_build_object('code_insee', pr.code_insee), 20000));
  end if;
  if l.lon is not null and l.lat is not null then
    v := v || jsonb_build_object('rga', private.lorani_http_get(b || 'rga', jsonb_build_object('latlon', format('%s,%s', l.lon, l.lat)), 20000));
  end if;
  update public.lorani_plu set complements = v, complements_statut = 'en_cours', complements_le = now(),
         servitudes = '[]'::jsonb, risques = '{}'::jsonb, secteur_protege = null
  where id = p_plu;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_complements_lancer(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_plu_geom_recue()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.geom is not null and new.geom is distinct from old.geom then
    perform private.lorani_plu_complements_lancer(new.id);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_geom_recue() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_plu'::regclass and tgname = 'lorani_plu_geom_recue') then
    create trigger lorani_plu_geom_recue after update of geom on public.lorani_plu
      for each row execute function private.lorani_plu_geom_recue();
  end if;
end $$;

-- Appliquer une réponse (sans réseau : c'est ce que les tests jouent).
CREATE OR REPLACE FUNCTION private.lorani_plu_complement_poser(p_projet uuid, p_etape text, p_statut_http integer, p_contenu text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  pr public.lorani_projets;
  j jsonb;
  v_sup jsonb;
  v_val text;
  v_ppr boolean;
  v_risques jsonb;
begin
  select * into l from public.lorani_plu where projet_id = p_projet for update;
  if not found or not (l.complements ? p_etape) then
    return jsonb_build_object('ignore', 'aucune demande ' || coalesce(p_etape, '?'));
  end if;
  select * into pr from public.lorani_projets where id = p_projet;
  begin
    j := p_contenu::jsonb;
  exception when others then
    j := null;
  end;
  if p_statut_http is distinct from 200 or j is null then
    update public.lorani_plu set complements = complements - p_etape,
           risques = jsonb_set(risques, '{erreurs}', coalesce(risques -> 'erreurs', '[]'::jsonb)
             || to_jsonb(format('%s : %s', case when p_etape like 'sup_%' then 'servitudes (Géoportail de l''urbanisme)' else p_etape || ' (Géorisques)' end,
                                coalesce('HTTP ' || p_statut_http, case when j is null and p_statut_http = 200 then 'réponse illisible' else 'pas de réponse' end))))
    where id = l.id;
  elsif p_etape like 'sup_%' then
    select coalesce(jsonb_agg(s order by s ->> 'categorie', s ->> 'nom'), '[]'::jsonb) into v_sup
    from (select distinct on (lower(x -> 'properties' ->> 'suptype'), coalesce(x -> 'properties' ->> 'nomsuplitt', x -> 'properties' ->> 'nomass'))
                 jsonb_build_object('categorie', upper(x -> 'properties' ->> 'suptype'), 'libelle_categorie', private.lorani_categorie_sup(x -> 'properties' ->> 'suptype'),
                                    'nom', left(coalesce(nullif(x -> 'properties' ->> 'nomsuplitt', ''), x -> 'properties' ->> 'nomass'), 200),
                                    'assiette', left(x -> 'properties' ->> 'typeass', 120), 'acte', nullif(x -> 'properties' ->> 'fichier', '')) as s
          from jsonb_array_elements(coalesce(j -> 'features', '[]'::jsonb)) x
          where x -> 'properties' ->> 'suptype' is not null) y;
    update public.lorani_plu set complements = complements - p_etape,
           servitudes = (select coalesce(jsonb_agg(distinct e), '[]'::jsonb) from jsonb_array_elements(servitudes || v_sup) e)
    where id = l.id;
  elsif p_etape = 'gaspar' then
    update public.lorani_plu set complements = complements - p_etape,
           risques = risques || jsonb_build_object('commune', coalesce((select jsonb_agg(distinct v #>> '{}') from jsonb_path_query(j, 'lax $.**.libelle_risque_long') v
                                                                        where nullif(v #>> '{}', '') is not null), '[]'::jsonb))
    where id = l.id;
  elsif p_etape = 'sismique' then
    v_val := coalesce(jsonb_path_query_first(j, 'lax $.**.zone_sismicite') #>> '{}', jsonb_path_query_first(j, 'lax $.**.code_zone') #>> '{}');
    update public.lorani_plu set complements = complements - p_etape, risques = risques || jsonb_build_object('sismicite', v_val) where id = l.id;
  elsif p_etape = 'radon' then
    v_val := jsonb_path_query_first(j, 'lax $.**.classe_potentiel') #>> '{}';
    update public.lorani_plu set complements = complements - p_etape, risques = risques || jsonb_build_object('radon', v_val) where id = l.id;
  elsif p_etape = 'rga' then
    v_val := coalesce(jsonb_path_query_first(j, 'lax $.**.exposition') #>> '{}', jsonb_path_query_first(j, 'lax $.**.codeExposition') #>> '{}');
    update public.lorani_plu set complements = complements - p_etape, risques = risques || jsonb_build_object('argiles', v_val) where id = l.id;
  end if;

  -- Tout est revenu : le bilan.
  select * into l from public.lorani_plu where id = l.id;
  if l.complements = '{}'::jsonb and l.complements_statut = 'en_cours' then
    v_ppr := exists (select 1 from jsonb_array_elements(l.servitudes) s where s ->> 'categorie' in ('PM1', 'PM3'));
    update public.lorani_plu set complements_statut = case when jsonb_array_length(coalesce(risques -> 'erreurs', '[]'::jsonb)) > 0 then 'partiel' else 'fait' end,
           secteur_protege = exists (select 1 from jsonb_array_elements(l.servitudes) s where s ->> 'categorie' in ('AC1', 'AC2', 'AC4')),
           complements_le = now()
    where id = l.id
    returning * into l;
    if l.secteur_protege or v_ppr then
      perform private.lever_alerte_module(l.client_id, 'lorani', 'attention',
        left(format('« %s » : %s%s%s.', left(pr.nom, 50),
                    case when l.secteur_protege then 'secteur protégé (' || (select string_agg(distinct s ->> 'libelle_categorie', ', ') from jsonb_array_elements(l.servitudes) s
                                                                               where s ->> 'categorie' in ('AC1', 'AC2', 'AC4')) || ') : avis de l''architecte des Bâtiments de France, délai d''instruction majoré (C. urb. R423-24)' else '' end,
                    case when l.secteur_protege and v_ppr then ' ; ' else '' end,
                    case when v_ppr then 'plan de prévention des risques : son règlement s''impose au projet (C. env. L562-4)' else '' end), 200),
        jsonb_build_object('projet', l.projet_id, 'servitudes', l.servitudes, 'risques', l.risques, 'lien', private.lorani_lien_projet(l.projet_id)),
        format('plu:%s:servitudes', l.projet_id), true, private.lorani_chef_de_projet(l.client_id, l.projet_id));
    end if;
    perform private.journaliser_module(l.client_id, 'lorani', 'lorani.servitudes_risques', 'lorani_projet', l.projet_id::text,
      jsonb_build_object('servitudes', l.servitudes, 'risques', l.risques, 'secteur_protege', l.secteur_protege, 'statut', l.complements_statut), l.entite_id);
  end if;
  return jsonb_build_object('projet', p_projet, 'etape', p_etape, 'statut', l.complements_statut);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_complement_poser(uuid, text, integer, text) FROM PUBLIC;

-- Relever les réponses arrivées.
CREATE OR REPLACE FUNCTION private.lorani_plu_complements_avancer(p_projet uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  e record;
  r record;
  n integer := 0;
begin
  select * into l from public.lorani_plu where projet_id = p_projet;
  if not found or l.complements_statut <> 'en_cours' then
    return 0;
  end if;
  for e in select k, (v #>> '{}')::bigint as id from jsonb_each(l.complements) t(k, v) loop
    select h.status_code, h.content, h.timed_out into r from net._http_response h where h.id = e.id;
    if found then
      perform private.lorani_plu_complement_poser(p_projet, e.k, case when r.timed_out then null else r.status_code end, r.content);
      n := n + 1;
    elsif l.complements_le < now() - interval '5 minutes' then
      perform private.lorani_plu_complement_poser(p_projet, e.k, null, null);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_complements_avancer(uuid) FROM PUBLIC;

-- La porte de l'écran (corps de b5_17) relève aussi les compléments.
CREATE OR REPLACE FUNCTION public.lorani_suivre_plu(p_projet uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
begin
  select * into pr from public.lorani_projets where id = p_projet;
  if not found or not private.lorani_voit_projet(pr.client_id, pr.entite_id, pr.id) then
    raise exception 'Projet introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  perform private.lorani_plu_avancer(p_projet);
  perform private.lorani_plu_complements_avancer(p_projet);
  return (select to_jsonb(x) - 'geom' - 'complements' from public.lorani_plu x where x.projet_id = p_projet);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_suivre_plu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_suivre_plu(uuid) TO authenticated;

-- Le passage des lectures (corps de b5_21) relève aussi les servitudes et les risques en cours.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  v_type text;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
  n_plu integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse',
                                                       'lorani.attestation.rappel', 'lorani.attestation.depasse', 'lorani.chantier.rappel', 'lorani.chantier.depasse'],
                                                 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      v_type := null;
      if t.genre = 'lorani.piece_lue' then
        select x.type_piece into v_type from public.pieces x where x.id = (t.charge ->> 'piece')::uuid;
      end if;
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      elsif t.genre in ('lorani.visa.rappel', 'lorani.visa.depasse') then
        v_res := private.lorani_visa_rappeler(t);
      elsif t.genre in ('lorani.attestation.rappel', 'lorani.attestation.depasse') then
        v_res := private.lorani_attestation_rappeler(t);
      elsif t.genre in ('lorani.chantier.rappel', 'lorani.chantier.depasse') then
        v_res := private.lorani_chantier_rappeler(t);
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type = 'lorani_attestation_decennale' then
        v_res := private.lorani_poser_attestation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement', 'lorani_metre', 'lorani_cerfa',
                           'lorani_attestation_re2020', 'lorani_plan_bet', 'lorani_notice')
            or exists (select 1 from public.lorani_controle_pieces cp where cp.piece_id = (t.charge ->> 'piece')::uuid) then
        v_res := private.lorani_piece_controle_lue((t.charge ->> 'piece')::uuid);
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Les recherches de PLU dont les réponses sont arrivées (ou qui ont attendu trop longtemps).
  for r in select l.projet_id from public.lorani_plu l where l.statut in ('geocodage', 'zonage') or l.complements_statut = 'en_cours' loop
    begin
      perform private.lorani_plu_avancer(r.projet_id);
      perform private.lorani_plu_complements_avancer(r.projet_id);
      n_plu := n_plu + 1;
    exception when others then
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences, 'plu', n_plu);
end $function$;
