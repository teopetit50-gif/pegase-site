-- LORANI, lot B5-17 — le PLU d'un projet, trouvé depuis son adresse (Géoportail de l'urbanisme, API Carto de l'IGN).
--
-- Pourquoi : n° 2 du carnet (« PLU lu depuis l'adresse ») et la promesse de la page des architectes (« contre le
-- règlement du PLU »). Le contrôle du dossier (b5_16) croise les planches avec un règlement lu ; encore faut-il savoir
-- quel document d'urbanisme et quelle zone s'appliquent à la parcelle. Lorani le cherche seul.
--
-- Les sources (publiques, sans clé) :
--   · géocodage : Géoplateforme, https://data.geopf.fr/geocodage/search (q, citycode, limit) — la Base Adresse Nationale ;
--   · parcelle (si l'adresse manque) : https://apicarto.ign.fr/api/cadastre/parcelle (code_insee, section, numero ;
--     Paris, Lyon, Marseille : commune + code_arr) ;
--   · zonage : https://apicarto.ign.fr/api/gpu/zone-urba (geom) — libellé de la zone, libellé long, type (U, AU, A, N),
--     partition, idurba, et le lien du règlement (urlfic) ; https://apicarto.ign.fr/api/gpu/document (geom) — type du
--     document (PLU, PLUi, CC, PSMV) et son titre ; https://apicarto.ign.fr/api/gpu/prescription-surf (geom) — les
--     prescriptions surfaciques (libellé, type) ; https://apicarto.ign.fr/api/gpu/municipality (insee) — commune au RNU.
--   La base appelle elle-même ces adresses par pg_net (déjà utilisé par les crons du socle) : la CSP du site n'autorise pas
--   le navigateur à les joindre, et rien ne transite par l'écran.
--
-- Ce qui est posé :
--   · public.lorani_plu : une ligne par projet (statut a_chercher | geocodage | zonage | trouve | introuvable | erreur,
--     méthode adresse | parcelle, point trouvé et son libellé, zones [{libelle, libelong, typezone, partition, idurba,
--     nomfic, urlfic, datvalid}], zone principale, document {du_type, titre, nom, partition}, lien du règlement,
--     prescriptions [{libelle, typepsc, stypepsc}], RNU, erreur). Lecture sous la RLS du projet ; écriture par le socle seul.
--   · public.lorani_chercher_plu(p_projet) (qui écrit sur le projet) : lance la recherche (géocodage, ou parcelle).
--   · public.lorani_suivre_plu(p_projet) (qui voit le projet) : relève les réponses arrivées, fait avancer, rend la ligne.
--   · private.lorani_plu_poser(p_projet, p_etape, p_statut_http, p_contenu) : applique une réponse (pure, testable sans
--     réseau) ; private.lorani_plu_avancer(p_projet) : lit net._http_response et appelle poser.
--   · private.lorani_lectures_passage() (corps de b5_16, cron */5) fait aussi avancer les recherches en cours.
--   · Trouvé : alerte info au chef de projet (« zone UMa du PLUi Nantes Métropole, règlement en ligne ») ; journal
--     lorani.plu_trouve. Introuvable ou erreur : alerte info avec la raison.
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_plu (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  statut text NOT NULL DEFAULT 'a_chercher',
  methode text,
  requete text,
  point_libelle text,
  point_score numeric(4,3),
  lon numeric(10,7),
  lat numeric(10,7),
  geom jsonb,
  req_geo bigint,
  req_zone bigint,
  req_doc bigint,
  req_psc bigint,
  req_rnu bigint,
  zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  zone text,
  document jsonb,
  reglement_url text,
  prescriptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rnu boolean,
  erreur text,
  demande_par uuid,
  demande_le timestamptz NOT NULL DEFAULT now(),
  trouve_le timestamptz,
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_plu_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_plu_projet_key UNIQUE (projet_id),
  CONSTRAINT lorani_plu_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_plu_statut_check CHECK (statut = ANY (ARRAY['a_chercher', 'geocodage', 'zonage', 'trouve', 'introuvable', 'erreur'])),
  CONSTRAINT lorani_plu_methode_check CHECK (methode IS NULL OR methode = ANY (ARRAY['adresse', 'parcelle'])),
  CONSTRAINT lorani_plu_erreur_check CHECK (erreur IS NULL OR char_length(erreur) <= 500)
);
ALTER TABLE public.lorani_plu ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lorani_plu FROM authenticated, anon;
GRANT SELECT ON TABLE public.lorani_plu TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_plu' and policyname = 'on voit le PLU des projets qu''on voit') then
    create policy "on voit le PLU des projets qu'on voit" on public.lorani_plu for select to authenticated
      using (private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_plu'::regclass and tgname = 'lorani_plu_tracer') then
    create trigger lorani_plu_tracer after insert or update on public.lorani_plu
      for each row execute function private.tracer('+projet_id', '+statut', '+methode', '+zone', '+reglement_url', '+erreur');
  end if;
end $$;

-- ——— les appels ———

CREATE OR REPLACE FUNCTION private.lorani_http_get(p_url text, p_params jsonb)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select net.http_get(url := p_url, params := p_params, headers := '{"Accept": "application/json"}'::jsonb, timeout_milliseconds := 20000)
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_http_get(text, jsonb) FROM PUBLIC;

-- Paris, Lyon, Marseille : le cadastre veut la commune et l'arrondissement.
CREATE OR REPLACE FUNCTION private.lorani_cadastre_params(p_insee text, p_parcelle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  m text[] := regexp_match(upper(btrim(coalesce(p_parcelle, ''))), '^(?:([0-9]{3})\s*)?([0-9A-Z]{1,2})\s*0*([0-9]{1,4})$');
  v jsonb;
begin
  if m is null or p_insee is null then
    return null;
  end if;
  v := jsonb_build_object('section', lpad(m[2], 2, '0'), 'numero', lpad(m[3], 4, '0'));
  if p_insee ~ '^751(0[1-9]|1[0-9]|20)$' then
    v := v || jsonb_build_object('code_insee', '75056', 'code_arr', substr(p_insee, 3));
  elsif p_insee ~ '^6938[1-9]$' then
    v := v || jsonb_build_object('code_insee', '69123', 'code_arr', substr(p_insee, 3));
  elsif p_insee ~ '^132(0[1-9]|1[0-6])$' then
    v := v || jsonb_build_object('code_insee', '13055', 'code_arr', substr(p_insee, 3));
  else
    v := v || jsonb_build_object('code_insee', p_insee);
  end if;
  if m[1] is not null then
    v := v || jsonb_build_object('com_abs', m[1]);
  end if;
  return v;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_cadastre_params(text, text) FROM PUBLIC;

-- Le zonage d'un point ou d'une parcelle : trois appels partis ensemble.
CREATE OR REPLACE FUNCTION private.lorani_plu_zoner(p_plu uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  g text;
begin
  select * into l from public.lorani_plu where id = p_plu;
  g := l.geom::text;
  update public.lorani_plu set statut = 'zonage', maj_le = now(),
         req_zone = private.lorani_http_get('https://apicarto.ign.fr/api/gpu/zone-urba', jsonb_build_object('geom', g)),
         req_doc = private.lorani_http_get('https://apicarto.ign.fr/api/gpu/document', jsonb_build_object('geom', g)),
         req_psc = private.lorani_http_get('https://apicarto.ign.fr/api/gpu/prescription-surf', jsonb_build_object('geom', g))
  where id = p_plu;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_zoner(uuid) FROM PUBLIC;

-- La parcelle, quand l'adresse manque ou ne mène qu'à la commune.
CREATE OR REPLACE FUNCTION private.lorani_plu_par_parcelle(p_plu uuid, p_motif text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  pr public.lorani_projets;
  v jsonb;
begin
  select * into l from public.lorani_plu where id = p_plu;
  select * into pr from public.lorani_projets where id = l.projet_id;
  v := private.lorani_cadastre_params(pr.code_insee, pr.parcelles[1]);
  if v is null then
    update public.lorani_plu set statut = 'introuvable', erreur = left(p_motif, 500), maj_le = now() where id = p_plu;
    return false;
  end if;
  update public.lorani_plu set statut = 'geocodage', methode = 'parcelle', requete = left(pr.code_insee || ' ' || pr.parcelles[1], 300), maj_le = now(),
         req_geo = private.lorani_http_get('https://apicarto.ign.fr/api/cadastre/parcelle', v)
  where id = p_plu;
  return true;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_par_parcelle(uuid, text) FROM PUBLIC;

-- ——— appliquer une réponse (sans réseau : c'est ce que les tests jouent) ———
-- p_etape : geo | zone | doc | psc | rnu ; p_statut_http : le code HTTP (null = pas de réponse, délai dépassé).
CREATE OR REPLACE FUNCTION private.lorani_plu_poser(p_projet uuid, p_etape text, p_statut_http integer, p_contenu text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  l public.lorani_plu;
  pr public.lorani_projets;
  j jsonb;
  f jsonb;
  v_zones jsonb;
  v_doc jsonb;
  v_titre text;
begin
  select * into l from public.lorani_plu where projet_id = p_projet for update;
  if not found then
    return jsonb_build_object('ignore', 'aucune recherche');
  end if;
  select * into pr from public.lorani_projets where id = p_projet;
  if p_statut_http is distinct from 200 then
    if p_etape = 'psc' then
      update public.lorani_plu set req_psc = null, maj_le = now() where id = l.id;
    else
      update public.lorani_plu set statut = 'erreur', maj_le = now(),
             erreur = left(format('Le service %s n''a pas répondu (%s).', case p_etape when 'geo' then 'de géocodage' else 'du Géoportail de l''urbanisme' end,
                                  coalesce('HTTP ' || p_statut_http, 'délai dépassé')), 500)
      where id = l.id;
    end if;
  else
    begin
      j := p_contenu::jsonb;
    exception when others then
      j := null;
    end;
    f := j -> 'features' -> 0;
    if p_etape = 'geo' and l.methode = 'adresse' then
      -- une adresse précise, dans la bonne commune ; sinon on tente la parcelle
      if f is null or f -> 'properties' ->> 'type' = 'municipality'
         or (pr.code_insee is not null and f -> 'properties' ->> 'citycode' is distinct from pr.code_insee and coalesce((f -> 'properties' ->> 'score')::numeric, 0) < 0.7) then
        perform private.lorani_plu_par_parcelle(l.id, case when f is null then 'Adresse introuvable dans la Base Adresse Nationale, et aucune parcelle lisible.'
                                                         else 'L''adresse ne mène qu''à la commune, et aucune parcelle lisible.' end);
      else
        update public.lorani_plu set lon = (f -> 'geometry' -> 'coordinates' ->> 0)::numeric, lat = (f -> 'geometry' -> 'coordinates' ->> 1)::numeric,
               point_libelle = left(f -> 'properties' ->> 'label', 300), point_score = round(coalesce((f -> 'properties' ->> 'score')::numeric, 0), 3),
               geom = f -> 'geometry'
        where id = l.id;
        perform private.lorani_plu_zoner(l.id);
      end if;
    elsif p_etape = 'geo' then
      -- la parcelle : sa géométrie sert au zonage (plusieurs zones possibles)
      if f is null then
        update public.lorani_plu set statut = 'introuvable', maj_le = now(),
               erreur = left(format('Parcelle %s introuvable au cadastre.', coalesce(l.requete, '?')), 500)
        where id = l.id;
      else
        update public.lorani_plu set geom = f -> 'geometry', point_libelle = left(format('Parcelle %s %s', f -> 'properties' ->> 'section', f -> 'properties' ->> 'numero'), 300)
        where id = l.id;
        perform private.lorani_plu_zoner(l.id);
      end if;
    elsif p_etape = 'zone' then
      select coalesce(jsonb_agg(jsonb_build_object('libelle', x -> 'properties' ->> 'libelle', 'libelong', x -> 'properties' ->> 'libelong',
               'typezone', x -> 'properties' ->> 'typezone', 'partition', x -> 'properties' ->> 'partition', 'idurba', x -> 'properties' ->> 'idurba',
               'nomfic', x -> 'properties' ->> 'nomfic', 'urlfic', nullif(x -> 'properties' ->> 'urlfic', ''), 'datvalid', nullif(x -> 'properties' ->> 'datvalid', ''))), '[]'::jsonb)
        into v_zones from jsonb_array_elements(coalesce(j -> 'features', '[]'::jsonb)) x;
      update public.lorani_plu set zones = v_zones, zone = v_zones -> 0 ->> 'libelle',
             reglement_url = (select z ->> 'urlfic' from jsonb_array_elements(v_zones) z where z ->> 'urlfic' ~ '^https?://' limit 1),
             req_zone = null, maj_le = now()
      where id = l.id;
      if jsonb_array_length(v_zones) = 0 and pr.code_insee is not null then
        -- sans zone : la commune est-elle au règlement national d'urbanisme ?
        update public.lorani_plu set req_rnu = private.lorani_http_get('https://apicarto.ign.fr/api/gpu/municipality', jsonb_build_object('insee', pr.code_insee))
        where id = l.id;
      end if;
    elsif p_etape = 'doc' then
      v_doc := (select jsonb_build_object('du_type', x -> 'properties' ->> 'du_type', 'titre', x -> 'properties' ->> 'grid_title', 'nom', x -> 'properties' ->> 'name',
                                          'partition', x -> 'properties' ->> 'partition')
                from jsonb_array_elements(coalesce(j -> 'features', '[]'::jsonb)) x
                order by case x -> 'properties' ->> 'du_type' when 'PSMV' then 0 when 'PLUi' then 1 when 'PLU' then 2 when 'POS' then 3 when 'CC' then 4 else 5 end
                limit 1);
      update public.lorani_plu set document = v_doc, req_doc = null, maj_le = now() where id = l.id;
    elsif p_etape = 'psc' then
      update public.lorani_plu set req_psc = null, maj_le = now(),
             prescriptions = (select coalesce(jsonb_agg(distinct jsonb_build_object('libelle', x -> 'properties' ->> 'libelle', 'typepsc', x -> 'properties' ->> 'typepsc',
                                                                                    'stypepsc', x -> 'properties' ->> 'stypepsc')), '[]'::jsonb)
                              from jsonb_array_elements(coalesce(j -> 'features', '[]'::jsonb)) x)
      where id = l.id;
    elsif p_etape = 'rnu' then
      update public.lorani_plu set req_rnu = null, maj_le = now(),
             rnu = exists (select 1 from jsonb_array_elements(coalesce(j -> 'features', '[]'::jsonb)) x
                           where x -> 'properties' ->> 'insee' = pr.code_insee and (x -> 'properties' ->> 'is_rnu')::boolean)
      where id = l.id;
    end if;
  end if;

  -- Tout est revenu : le zonage est trouvé, ou non.
  select * into l from public.lorani_plu where id = l.id;
  if l.statut = 'zonage' and l.req_zone is null and l.req_doc is null and l.req_psc is null and l.req_rnu is null then
    if jsonb_array_length(l.zones) > 0 then
      v_titre := coalesce(l.document ->> 'titre', l.document ->> 'du_type', 'document d''urbanisme');
      update public.lorani_plu set statut = 'trouve', trouve_le = now(), erreur = null, maj_le = now() where id = l.id;
      perform private.lever_alerte_module(l.client_id, 'lorani', 'info',
        left(format('« %s » : zone %s%s du %s%s.', left(pr.nom, 50), l.zone,
                    case when jsonb_array_length(l.zones) > 1 then format(' (et %s autre%s)', jsonb_array_length(l.zones) - 1, case when jsonb_array_length(l.zones) > 2 then 's' else '' end) else '' end,
                    left(v_titre, 70), case when l.reglement_url is not null then ', règlement en ligne' else '' end), 200),
        jsonb_build_object('projet', l.projet_id, 'zone', l.zone, 'document', l.document, 'reglement', l.reglement_url, 'lien', private.lorani_lien_projet(l.projet_id)),
        format('plu:%s', l.projet_id), true, private.lorani_chef_de_projet(l.client_id, l.projet_id));
      perform private.journaliser_module(l.client_id, 'lorani', 'lorani.plu_trouve', 'lorani_projet', l.projet_id::text,
        jsonb_build_object('methode', l.methode, 'point', l.point_libelle, 'zones', l.zones, 'document', l.document, 'reglement', l.reglement_url), l.entite_id);
    else
      update public.lorani_plu set statut = 'introuvable', maj_le = now(),
             erreur = case when l.rnu then 'Commune au règlement national d''urbanisme (RNU) : pas de PLU, les articles R111-1 et suivants s''appliquent.'
                           else 'Aucune zone du Géoportail de l''urbanisme à cet endroit (document non publié, ou carte communale).' end
      where id = l.id;
    end if;
  end if;
  select * into l from public.lorani_plu where id = l.id;
  if l.statut in ('introuvable', 'erreur') and p_etape is distinct from 'psc' then
    perform private.lever_alerte_module(l.client_id, 'lorani', 'info', left(format('« %s » : PLU non trouvé — %s', left(pr.nom, 50), l.erreur), 200),
      jsonb_build_object('projet', l.projet_id, 'statut', l.statut, 'lien', private.lorani_lien_projet(l.projet_id)),
      format('plu:%s', l.projet_id), true, private.lorani_chef_de_projet(l.client_id, l.projet_id));
  end if;
  return jsonb_build_object('projet', p_projet, 'etape', p_etape, 'statut', l.statut);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_poser(uuid, text, integer, text) FROM PUBLIC;

-- Relever les réponses arrivées dans net._http_response.
CREATE OR REPLACE FUNCTION private.lorani_plu_avancer(p_projet uuid)
 RETURNS jsonb
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
  for e in select * from (values ('geo'), ('zone'), ('doc'), ('psc'), ('rnu')) t(etape) loop
    select * into l from public.lorani_plu where projet_id = p_projet;
    exit when not found or l.statut not in ('geocodage', 'zonage');
    continue when (case e.etape when 'geo' then l.req_geo when 'zone' then l.req_zone when 'doc' then l.req_doc when 'psc' then l.req_psc else l.req_rnu end) is null;
    continue when e.etape = 'geo' and l.statut <> 'geocodage';
    select h.status_code, h.content, h.timed_out into r from net._http_response h
    where h.id = case e.etape when 'geo' then l.req_geo when 'zone' then l.req_zone when 'doc' then l.req_doc when 'psc' then l.req_psc else l.req_rnu end;
    if found then
      perform private.lorani_plu_poser(p_projet, e.etape, case when r.timed_out then null else r.status_code end, r.content);
      n := n + 1;
    elsif l.maj_le < now() - interval '5 minutes' then
      perform private.lorani_plu_poser(p_projet, e.etape, null, null);
      n := n + 1;
    end if;
  end loop;
  select * into l from public.lorani_plu where projet_id = p_projet;
  return jsonb_build_object('projet', p_projet, 'statut', l.statut, 'releves', n);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_avancer(uuid) FROM PUBLIC;

-- ——— les portes de l'écran ———

CREATE OR REPLACE FUNCTION public.lorani_chercher_plu(p_projet uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_id uuid;
  v_adresse text;
begin
  select * into pr from public.lorani_projets where id = p_projet;
  if not found or not private.lorani_ecrit_projet(pr.client_id, pr.entite_id, pr.id) then
    raise exception 'Projet introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  v_adresse := nullif(btrim(concat_ws(' ', pr.adresse, pr.code_postal, pr.commune)), '');
  insert into public.lorani_plu (client_id, entite_id, projet_id, statut, demande_par)
  values (pr.client_id, pr.entite_id, pr.id, 'a_chercher', (select auth.uid()))
  on conflict (projet_id) do update set statut = 'a_chercher', methode = null, requete = null, point_libelle = null, point_score = null,
    lon = null, lat = null, geom = null, req_geo = null, req_zone = null, req_doc = null, req_psc = null, req_rnu = null,
    zones = '[]'::jsonb, zone = null, document = null, reglement_url = null, prescriptions = '[]'::jsonb, rnu = null, erreur = null,
    demande_par = excluded.demande_par, demande_le = now(), trouve_le = null, maj_le = now()
  returning id into v_id;
  if pr.adresse is not null and btrim(pr.adresse) <> '' then
    update public.lorani_plu set statut = 'geocodage', methode = 'adresse', requete = left(v_adresse, 300),
           req_geo = private.lorani_http_get('https://data.geopf.fr/geocodage/search',
                       jsonb_strip_nulls(jsonb_build_object('q', v_adresse, 'citycode', pr.code_insee, 'limit', '1')))
    where id = v_id;
  else
    perform private.lorani_plu_par_parcelle(v_id, 'Ni adresse ni parcelle lisible sur le projet : renseignez l''un ou l''autre.');
  end if;
  return (select to_jsonb(x) - 'geom' from public.lorani_plu x where x.id = v_id);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_chercher_plu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_chercher_plu(uuid) TO authenticated;

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
  return (select to_jsonb(x) - 'geom' from public.lorani_plu x where x.projet_id = p_projet);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_suivre_plu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_suivre_plu(uuid) TO authenticated;

-- Le passage des lectures (corps de b5_16) fait aussi avancer les recherches de PLU en cours.
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
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse'],
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
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement')
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
  for r in select l.projet_id from public.lorani_plu l where l.statut in ('geocodage', 'zonage') loop
    begin
      perform private.lorani_plu_avancer(r.projet_id);
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
