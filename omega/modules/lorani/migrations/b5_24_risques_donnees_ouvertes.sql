-- LORANI, lot B5-24 — les risques de la commune lus dans les données ouvertes, sans l'API Géorisques (sur b5_23).
--
-- Pourquoi : le relevé réel du coordinateur (06/10/2026, 20 h 15 Z, Nantes) montre que l'API Géorisques
-- (georisques.gouv.fr/api/v1) n'aboutit jamais depuis nos hébergeurs : poignée TLS au-delà de 20 s, depuis Supabase
-- comme depuis nos conteneurs ; geoservices.brgm.fr renvoie « Request Rejected ». Les IP de cloud sont filtrées.
-- Les mêmes données existent en fichiers ouverts, eux joignables (vérifié le 06/10 depuis le poste de B5) :
--   · GASPAR, risques recensés par commune (DDRM) : https://files.georisques.fr/GASPAR/gaspar.zip, fichier
--     ddrm_risq_gaspar_<date>.csv (cod_commune;lib_commune;lib_risque;num_risque), 31 733 communes, mis à jour chaque
--     semaine par le ministère. Le code 127 « Tassements différentiels » y porte le retrait-gonflement des argiles.
--   · Zonage sismique (décret n° 2010-1255, en vigueur depuis le 1er mai 2011) : data.gouv.fr, « Zonage sismique de la
--     France », table attributaire (insee ; Sismicite « 3 - Modérée »), 35 363 communes. Le zonage n'a pas changé.
--   · Potentiel radon (arrêté du 27 juin 2018) : data.gouv.fr, ASN, « Connaître le potentiel radon de ma commune »,
--     radon.csv (insee_com ; classe_potentiel 1 à 3), 36 093 lignes, arrondissements compris.
-- Licence ouverte Etalab. Les fichiers de données sont générés par omega/recette-b5/risques/generer.mjs et posés par
-- omega/modules/lorani/donnees/b5_24_*.sql (appels de private.lorani_ref_charger) ; GASPAR se recharge en relançant
-- le script (même clé : la commune ; une commune rechargée prend sa nouvelle liste).
--
-- Ce qui est posé :
--   · public.lorani_ref_risques (code_insee, risques text[] des numéros GASPAR), public.lorani_ref_risques_libelles,
--     public.lorani_ref_sismicite (code_insee, zone, libelle), public.lorani_ref_radon (code_insee, classe),
--     public.lorani_ref_sources (nom, source, version, lignes, charge_le). RLS sans politique : lues par les fonctions
--     ci-dessous ; écrites par la clé de service et par private.lorani_ref_charger.
--   · private.lorani_ref_charger(nom, lignes, source, version) : « sismicite » (insee;zone;libellé), « radon »
--     (insee;classe), « risques » (insee;num,num,…), « libelles » (num;libellé). Insertion ou mise à jour, jamais de retrait.
--   · private.lorani_risques_commune(code_insee) → jsonb {commune: [risques principaux], detail: [« Inondation : par une
--     crue … »], sismicite, radon, argiles, sources} ; Paris, Lyon et Marseille : l'arrondissement d'abord, la commune
--     ensuite. Une source vide ou une commune absente est dite dans « erreurs ».
--   · private.lorani_plu_complements_lancer (corps de b5_23) : les servitudes partent toujours vers l'API Carto de l'IGN
--     (elle répond) ; les risques sont posés tout de suite depuis les tables, sans appel réseau.
-- Idempotent ; rien n'est retiré (les branches Géorisques de lorani_plu_complement_poser restent, inutilisées).

CREATE TABLE IF NOT EXISTS public.lorani_ref_risques (
  code_insee text PRIMARY KEY CHECK (code_insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  risques text[] NOT NULL DEFAULT '{}',
  maj_le timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lorani_ref_risques_libelles (
  num text PRIMARY KEY,
  libelle text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lorani_ref_sismicite (
  code_insee text PRIMARY KEY CHECK (code_insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  zone smallint NOT NULL CHECK (zone BETWEEN 1 AND 5),
  libelle text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.lorani_ref_radon (
  code_insee text PRIMARY KEY CHECK (code_insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  classe smallint NOT NULL CHECK (classe BETWEEN 1 AND 3)
);
CREATE TABLE IF NOT EXISTS public.lorani_ref_sources (
  nom text PRIMARY KEY,
  source text NOT NULL,
  version text,
  lignes integer NOT NULL DEFAULT 0,
  charge_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lorani_ref_risques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_ref_risques_libelles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_ref_sismicite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_ref_radon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_ref_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lorani_ref_risques, public.lorani_ref_risques_libelles, public.lorani_ref_sismicite, public.lorani_ref_radon, public.lorani_ref_sources
  FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.lorani_ref_risques, public.lorani_ref_risques_libelles, public.lorani_ref_sismicite, public.lorani_ref_radon, public.lorani_ref_sources
  TO service_role;

-- Charger un lot de lignes (« ; » entre champs, une ligne par commune).
CREATE OR REPLACE FUNCTION private.lorani_ref_charger(p_nom text, p_lignes text, p_source text, p_version text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  n integer := 0;
begin
  if p_nom not in ('sismicite', 'radon', 'risques', 'libelles') then
    raise exception 'référentiel inconnu : %', p_nom using errcode = '22023';
  end if;
  with l as (
    select string_to_array(btrim(x, E' \r'), ';') as c
    from regexp_split_to_table(coalesce(p_lignes, ''), E'\n') x
    where btrim(x, E' \r') <> ''
  ), ins as (
    insert into public.lorani_ref_sismicite (code_insee, zone, libelle)
    select c[1], c[2]::smallint, c[3] from l where p_nom = 'sismicite'
    on conflict (code_insee) do update set zone = excluded.zone, libelle = excluded.libelle
    returning 1
  ) select count(*) into n from ins;
  if p_nom = 'radon' then
    with l as (
      select string_to_array(btrim(x, E' \r'), ';') as c from regexp_split_to_table(p_lignes, E'\n') x where btrim(x, E' \r') <> ''
    ), ins as (
      insert into public.lorani_ref_radon (code_insee, classe) select c[1], c[2]::smallint from l
      on conflict (code_insee) do update set classe = excluded.classe
      returning 1
    ) select count(*) into n from ins;
  elsif p_nom = 'risques' then
    with l as (
      select string_to_array(btrim(x, E' \r'), ';') as c from regexp_split_to_table(p_lignes, E'\n') x where btrim(x, E' \r') <> ''
    ), ins as (
      insert into public.lorani_ref_risques (code_insee, risques, maj_le)
      select c[1], coalesce(string_to_array(nullif(c[2], ''), ','), '{}'), now() from l
      on conflict (code_insee) do update set risques = excluded.risques, maj_le = now()
      returning 1
    ) select count(*) into n from ins;
  elsif p_nom = 'libelles' then
    with l as (
      select string_to_array(btrim(x, E' \r'), ';') as c from regexp_split_to_table(p_lignes, E'\n') x where btrim(x, E' \r') <> ''
    ), ins as (
      insert into public.lorani_ref_risques_libelles (num, libelle) select c[1], c[2] from l
      on conflict (num) do update set libelle = excluded.libelle
      returning 1
    ) select count(*) into n from ins;
  end if;
  insert into public.lorani_ref_sources (nom, source, version, lignes, charge_le)
  values (p_nom, coalesce(p_source, '?'), p_version,
          case p_nom when 'sismicite' then (select count(*) from public.lorani_ref_sismicite) when 'radon' then (select count(*) from public.lorani_ref_radon)
                     when 'risques' then (select count(*) from public.lorani_ref_risques) else (select count(*) from public.lorani_ref_risques_libelles) end,
          now())
  on conflict (nom) do update set source = excluded.source, version = excluded.version, lignes = excluded.lignes, charge_le = now();
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_ref_charger(text, text, text, text) FROM PUBLIC;

-- Les risques connus d'une commune.
CREATE OR REPLACE FUNCTION private.lorani_risques_commune(p_insee text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_codes text[];
  v_commune text;
  v_risques text[];
  s public.lorani_ref_sismicite;
  v_radon smallint;
  v_err jsonb := '[]'::jsonb;
  v jsonb := '{}'::jsonb;
begin
  if p_insee is null or p_insee !~ '^[0-9][0-9AB][0-9]{3}$' then
    return jsonb_build_object('erreurs', jsonb_build_array('risques : code commune inconnu'));
  end if;
  -- Paris, Lyon, Marseille : l'arrondissement d'abord, la commune ensuite.
  v_commune := case when p_insee ~ '^751(0[1-9]|1[0-9]|20)$' then '75056' when p_insee ~ '^6938[1-9]$' then '69123'
                    when p_insee ~ '^132(0[1-9]|1[0-6])$' then '13055' else p_insee end;
  v_codes := array[p_insee, v_commune];

  select r.risques into v_risques from public.lorani_ref_risques r where r.code_insee = any (v_codes) order by r.code_insee = p_insee desc limit 1;
  if not exists (select 1 from public.lorani_ref_risques) then
    v_err := v_err || to_jsonb('risques de la commune : référentiel GASPAR non chargé'::text);
  elsif v_risques is null then
    v := v || jsonb_build_object('commune', '[]'::jsonb);
  else
    v := v || jsonb_build_object(
      'commune', coalesce((select jsonb_agg(b.libelle order by b.num) from public.lorani_ref_risques_libelles b
                           where b.num = any (v_risques) and b.num ~ '^[0-9]{2}$'), '[]'::jsonb),
      'detail', coalesce((select jsonb_agg(p.libelle || ' : ' || lower(left(b.libelle, 1)) || substr(b.libelle, 2) order by b.num)
                          from public.lorani_ref_risques_libelles b
                          join public.lorani_ref_risques_libelles p on p.num = left(b.num, 2)
                          where b.num = any (v_risques) and b.num ~ '^[0-9]{3}$'), '[]'::jsonb),
      'argiles', case when '127' = any (v_risques) then 'Retrait-gonflement recensé dans la commune (tassements différentiels)' end);
  end if;

  select * into s from public.lorani_ref_sismicite x where x.code_insee = any (v_codes) order by x.code_insee = p_insee desc limit 1;
  if s.code_insee is not null then
    v := v || jsonb_build_object('sismicite', s.libelle);
  elsif not exists (select 1 from public.lorani_ref_sismicite) then
    v_err := v_err || to_jsonb('sismicité : zonage non chargé'::text);
  else
    v_err := v_err || to_jsonb(format('sismicité : commune %s absente du zonage de 2011 (commune nouvelle ?)', p_insee));
  end if;

  select x.classe into v_radon from public.lorani_ref_radon x where x.code_insee = any (v_codes) order by x.code_insee = p_insee desc limit 1;
  if v_radon is not null then
    v := v || jsonb_build_object('radon', v_radon::text);
  elsif not exists (select 1 from public.lorani_ref_radon) then
    v_err := v_err || to_jsonb('radon : référentiel non chargé'::text);
  else
    v_err := v_err || to_jsonb(format('radon : commune %s absente de l''arrêté de 2018 (commune nouvelle ?)', p_insee));
  end if;

  v := v || jsonb_build_object('sources', coalesce((select jsonb_object_agg(o.nom, jsonb_build_object('source', o.source, 'version', o.version, 'charge_le', o.charge_le))
                                                    from public.lorani_ref_sources o), '{}'::jsonb));
  if jsonb_array_length(v_err) > 0 then
    v := v || jsonb_build_object('erreurs', v_err);
  end if;
  return v;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_risques_commune(text) FROM PUBLIC;

-- Lancer les compléments (corps de b5_23) : servitudes par l'IGN, risques depuis les tables.
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
  v_risques jsonb;
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
  v_risques := private.lorani_risques_commune(pr.code_insee);
  update public.lorani_plu set complements = v, complements_statut = 'en_cours', complements_le = now(),
         servitudes = '[]'::jsonb, risques = v_risques, secteur_protege = null
  where id = p_plu;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_plu_complements_lancer(uuid) FROM PUBLIC;
