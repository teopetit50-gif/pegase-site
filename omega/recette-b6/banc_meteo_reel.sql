-- banc_meteo_reel — la météo RÉELLE (MET Norway) sur le banc (cccccccc-0000-4000-8000-00000000000c), session B6, 06/10/2026.
-- PAS un test : rien n'est annulé. Prérequis : banc_j2_reel.sql A bis et B joués (chantier ESSAI-J2 ouvert), b6_21 et
-- b6_21b posés, réglage reglages/meteo_met_norway.sql posé. Ordre : A, B (une à deux minutes après), C (lecture),
-- D (clôture : le passage d'essai est annulé). Rejouable ; rien n'est effacé.
-- À jouer en plusieurs appels (execute_sql ne rend que la dernière requête de chaque appel).

-- ═══ A. Le gérant localise le chantier ESSAI-J2 (Lyon 7e) et pose un passage EXTÉRIEUR demain ; puis la demande météo.
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_demain date := (now() at time zone 'Europe/Paris')::date + 1;
  v_ch uuid;
  v_j jsonb;
begin
  select id into v_ch from public.btp_chantiers where client_id = v_client and reference = 'ESSAI-J2';
  if v_ch is null then
    raise exception 'Chantier ESSAI-J2 absent : jouer banc_j2_reel.sql (A bis et B) d''abord.';
  end if;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  update public.btp_chantiers set latitude = 45.7489, longitude = 4.8432
  where id = v_ch and (latitude is null or longitude is null);
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(jsonb_build_object(
    'ref', 'METEO-1', 'lot', '01', 'tache', 'Pose des garde-corps en façade (essai météo)', 'debut', v_demain, 'fin', v_demain,
    'exterieur', true)), false);
  raise notice 'import : %', v_j;
  perform tests.redevenir_admin();
end $$;
select private.btp_meteo_demander() as demandes;
-- → attendu : 1 (une requête pg_net vers api.met.no, User-Agent « OmegaAI/1.0 contact@omegaai.fr »).

-- ═══ B. Une à deux minutes plus tard : la réponse brute de pg_net (statut, en-têtes de cache, début du corps).
select x.status_code, x.headers ->> 'Expires' as expires, x.headers ->> 'Last-Modified' as last_modified,
       x.timed_out, x.error_msg, left(x.content, 300) as debut
from public.btp_meteo m join net._http_response x on x.id = m.demande_id
where m.chantier_id = (select id from public.btp_chantiers where client_id = 'cccccccc-0000-4000-8000-00000000000c' and reference = 'ESSAI-J2');
-- → attendu : 200, Expires et Last-Modified présents, un corps qui commence par {"type":"Feature",…

-- ═══ C. La lecture : la prévision rangée en jours de Paris, et les risques du passage d'essai.
select private.btp_meteo_lire() as lues;
select m.fournisseur, m.recue_le, m.expire_le, m.erreur, jsonb_pretty(m.prevision) as prevision,
       jsonb_pretty(private.btp_risques_meteo('cccccccc-0000-4000-8000-00000000000c', (now() at time zone 'Europe/Paris')::date, m.chantier_id)) as risques
from public.btp_meteo m
where m.chantier_id = (select id from public.btp_chantiers where client_id = 'cccccccc-0000-4000-8000-00000000000c' and reference = 'ESSAI-J2');
-- → attendu : met_norway, 7 jours au plus {jour, pluie_mm, vent_kmh, tmin, tmax, rafales_kmh: null}, erreur null ;
--   des risques seulement si demain dépasse un seuil (pluie ≥ 5 mm, vent moyen ≥ 40 km/h, gel).

-- ═══ D. Clôture : le passage d'essai est annulé (plus de demande météo pour lui). Rien n'est effacé.
do $$
declare
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  update public.btp_passages set statut = 'annule'
  where client_id = 'cccccccc-0000-4000-8000-00000000000c' and source_ref = 'METEO-1' and statut = 'prevu';
  perform tests.redevenir_admin();
end $$;
select p.tache, p.statut from public.btp_passages p
where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.source_ref = 'METEO-1';
