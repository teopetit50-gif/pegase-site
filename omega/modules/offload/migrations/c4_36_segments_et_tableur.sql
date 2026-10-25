-- c4_36 — OFFLOAD : la valeur en jeu par segment, et la restitution en tableur (session C4, 25/10/2026)
--
-- Demande du 25/10 (Teo, relayée) : « valeur en jeu par segment et export tableur de la restitution ».
--   · public.offload_valeur_par_segment(p_client) : par segment (secteur du compte, « Sans segment » à défaut), les
--     comptes suivis, ceux à risque (éteint, décroche, saison, ralentit), la valeur annuelle en jeu chez ces derniers et
--     les reprises en cours. Les comptes effacés et retirés n'y figurent pas. Gérant ou administrateur.
--   · public.offload_restitution_tableur(p_client) : la restitution complète (c4_17) en fichiers CSV, un par famille
--     (séparateur « ; », guillemets doublés, une ligne d'en-tête), prêts pour un tableur. Gérant ou administrateur ;
--     au journal comme la restitution elle-même.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function private.offload_valeur_par_segment(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'lire la valeur en jeu par segment');
  return coalesce((
    select jsonb_agg(jsonb_build_object('segment', x.segment, 'comptes', x.comptes, 'a_risque', x.a_risque,
                                        'valeur_en_jeu', x.valeur_en_jeu, 'reprises_en_cours', x.reprises)
                     order by x.valeur_en_jeu desc, x.segment)
    from (
      select coalesce(nullif(btrim(c.secteur), ''), 'Sans segment') as segment,
             count(*) as comptes,
             count(*) filter (where s.niveau in ('eteint', 'decroche', 'saison', 'ralentit')) as a_risque,
             coalesce(sum(s.valeur_annuelle) filter (where s.niveau in ('eteint', 'decroche', 'saison', 'ralentit')), 0) as valeur_en_jeu,
             count(*) filter (where exists (select 1 from public.offload_reprises p where p.compte_id = c.id
                                              and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee'))) as reprises
      from public.offload_comptes c
      left join public.offload_signaux s on s.compte_id = c.id
      where c.client_id = p_client and c.statut = 'suivi' and c.efface_le is null and c.fusionne_dans is null
      group by 1) x), '[]'::jsonb);
end $function$;

create or replace function public.offload_valeur_par_segment(p_client uuid)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_valeur_par_segment(p_client) $function$;

-- Une valeur de cellule CSV : guillemets doublés, entre guillemets si besoin.
create or replace function private.offload_csv_cellule(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p is null then ''
              when p ~ '[;"\n\r]' then '"' || replace(p, '"', '""') || '"'
              else p end
$function$;

create or replace function private.offload_restitution_tableur(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d jsonb;
  f text;
  v_lignes jsonb;
  v_cles text[];
  v_csv text;
  r jsonb;
  v_fichiers jsonb := '{}'::jsonb;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'restituer les données OFFLOAD en tableur');
  d := private.offload_restitution(p_client) -> 'donnees';   -- contrôle des droits et journal (c4_17)
  for f in select k from jsonb_object_keys(d) k order by k loop
    v_lignes := d -> f;
    continue when jsonb_typeof(v_lignes) <> 'array' or jsonb_array_length(v_lignes) = 0;
    select array_agg(k order by k) into v_cles from (select distinct jsonb_object_keys(x) as k from jsonb_array_elements(v_lignes) x) z;
    v_csv := array_to_string(array(select private.offload_csv_cellule(k) from unnest(v_cles) k), ';');
    for r in select x from jsonb_array_elements(v_lignes) x loop
      v_csv := v_csv || E'\n' || array_to_string(array(
        select private.offload_csv_cellule(case jsonb_typeof(r -> k) when 'string' then r ->> k when 'null' then null
                                                                       else (r -> k)::text end)
        from unnest(v_cles) k), ';');
    end loop;
    v_fichiers := v_fichiers || jsonb_build_object('offload-' || replace(f, '_', '-') || '.csv', v_csv);
  end loop;
  return jsonb_build_object('format', 'csv ; séparateur « ; » ; UTF-8', 'fichiers', v_fichiers);
end $function$;

create or replace function public.offload_restitution_tableur(p_client uuid)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_restitution_tableur(p_client) $function$;

revoke execute on function private.offload_valeur_par_segment(uuid) from public, anon;
grant execute on function private.offload_valeur_par_segment(uuid) to authenticated, service_role;
revoke execute on function public.offload_valeur_par_segment(uuid) from public, anon;
grant execute on function public.offload_valeur_par_segment(uuid) to authenticated, service_role;
revoke execute on function private.offload_csv_cellule(text) from public, anon, authenticated;
grant execute on function private.offload_csv_cellule(text) to service_role;
revoke execute on function private.offload_restitution_tableur(uuid) from public, anon;
grant execute on function private.offload_restitution_tableur(uuid) to authenticated, service_role;
revoke execute on function public.offload_restitution_tableur(uuid) from public, anon;
grant execute on function public.offload_restitution_tableur(uuid) to authenticated, service_role;
