-- 20261015135154 b6_35_ordre_meteo
-- Source : dépôt : b8081b3 omega/modules/daliro/migrations/b6_35_ordre_meteo.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_35_ordre_meteo.sql @ b8081b3 ; b6_31 cité comme test : ignoré.
-- ═══ omega/modules/daliro/migrations/b6_35_ordre_meteo.sql @ b8081b3
-- b6_35 — DALIRO : sur pluie annoncée, un nouvel ordre de la semaine proposé (session B6, 15/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Quand de la pluie ou du gel est annoncé, Daliro propose un nouvel ordre
-- d'intervention pour la semaine. Le conducteur de travaux le valide ou le modifie. » et « Quand trois jours de pluie
-- sont annoncés, l'ordre des chantiers de la semaine est reproposé avant le départ des équipes. » La météo (b6_21,
-- b6_21b) ne levait qu'une alerte par passage : « décalez ou protégez ».
--
-- CE QUI EST POSÉ.
--   · private.btp_jours_secs(passage, du, au) : sur la prévision du chantier du passage, chaque jour de la période
--     passe les seuils du passage (pluie, vent ou rafales, gel, chaleur), les mêmes que btp_risques_meteo.
--   · public.btp_ordre_meteo(client) : pour chaque passage EXTÉRIEUR menacé dans les 7 jours, réalisé par une ÉQUIPE
--     de l'entreprise, l'échange proposé avec un passage INTÉRIEUR de la même équipe dans les 7 jours (sur ce chantier
--     ou un autre), de même durée, qui n'a ni n'impose aucune dépendance, et dont les jours sont secs pour le passage
--     extérieur. Au plus une proposition par passage menacé, la plus proche. Les sous-traitants ne sont pas déplacés
--     ici : leur alerte reste « décalez ou protégez » et le recalage (b6_19, b6_34) les prévient.
--   · public.btp_echanger_passages(exterieur, interieur, motif) : le conducteur valide ; les dates des deux passages
--     s'échangent après avoir revérifié chaque condition. Journal daliro.ordre_meteo. Rien ne bouge sans lui.
--   · Droits : le planning (private.btp_exiger_planning) ; fonction « meteo » de la formule (Chantiers, Entreprise).
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_jours_secs(p_passage uuid, p_du date, p_au date)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(bool_and(
           coalesce((d ->> 'pluie_mm')::numeric, 0) < coalesce(p.seuil_pluie_mm, 5)
           and case when d ->> 'rafales_kmh' is not null then (d ->> 'rafales_kmh')::numeric < coalesce(p.seuil_vent_kmh, 60)
                    else coalesce((d ->> 'vent_kmh')::numeric, 0) < round(coalesce(p.seuil_vent_kmh, 60) * 2 / 3.0) end
           and coalesce((d ->> 'tmin')::numeric, 99) >= coalesce(p.seuil_temp_min, 0)
           and (p.seuil_temp_max is null or coalesce((d ->> 'tmax')::numeric, -99) <= p.seuil_temp_max)), false)
    -- chaque jour de la période doit être dans la prévision : un jour sans prévision n'est pas « sec »
    and (select count(*) from public.btp_meteo m2 cross join lateral jsonb_array_elements(m2.prevision) d2
         where m2.chantier_id = p.chantier_id and (d2 ->> 'jour')::date between p_du and p_au) = (p_au - p_du + 1)
  from public.btp_passages p
  join public.btp_meteo m on m.chantier_id = p.chantier_id
  cross join lateral jsonb_array_elements(m.prevision) d
  where p.id = p_passage and (d ->> 'jour')::date between p_du and p_au
  group by p.chantier_id
$function$;

create or replace function public.btp_ordre_meteo(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  r jsonb;
  x public.btp_passages;
  i record;
  v_props jsonb := '[]'::jsonb;
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Le planning de cette organisation ne vous est pas ouvert.' using errcode = '42501';
    end if;
  end if;
  perform private.btp_exiger_fonction(p_client, 'meteo');
  for r in select e from jsonb_array_elements(private.btp_risques_meteo(p_client, v_jour, null)) e loop
    select * into x from public.btp_passages where id = (r ->> 'passage_id')::uuid;
    continue when x.equipe_id is null
      or exists (select 1 from public.btp_dependances d where x.id in (d.amont_id, d.aval_id));
    select p.id, p.tache, p.debut, p.fin, c.nom as chantier_nom into i
    from public.btp_passages p join public.btp_chantiers c on c.id = p.chantier_id
    where p.client_id = p_client and p.statut = 'prevu' and not p.exterieur and p.remplace_par_id is null
      and p.equipe_id = x.equipe_id and p.id <> x.id
      and p.debut between v_jour and v_jour + 6 and p.debut > v_jour
      and (p.fin - p.debut) = (x.fin - x.debut)
      and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_dependances d where p.id in (d.amont_id, d.aval_id))
      and private.btp_jours_secs(x.id, p.debut, p.fin)
    order by abs(p.debut - x.debut), p.debut
    limit 1;
    continue when i.id is null;
    v_props := v_props || jsonb_build_object(
      'exterieur', x.id, 'exterieur_tache', x.tache, 'exterieur_chantier', r ->> 'chantier_nom', 'exterieur_debut', x.debut, 'exterieur_fin', x.fin,
      'risque', r ->> 'texte', 'interieur', i.id, 'interieur_tache', i.tache, 'interieur_chantier', i.chantier_nom,
      'interieur_debut', i.debut, 'interieur_fin', i.fin,
      'texte', format('Échanger « %s » (%s, extérieur, %s) avec « %s » (%s, intérieur, %s) : l''extérieur passe au sec, l''intérieur prend le jour de pluie.',
                      coalesce(x.tache, 'passage'), r ->> 'chantier_nom', to_char(x.debut, 'DD/MM'),
                      coalesce(i.tache, 'passage'), i.chantier_nom, to_char(i.debut, 'DD/MM')));
    i := null;
  end loop;
  return jsonb_build_object('jour', v_jour, 'propositions', v_props);
end $function$;

create or replace function public.btp_echanger_passages(p_exterieur uuid, p_interieur uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_passages;
  i public.btp_passages;
begin
  select * into x from public.btp_passages where id = p_exterieur for update;
  select * into i from public.btp_passages where id = p_interieur for update;
  if x.id is null or i.id is null or x.client_id <> i.client_id then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(x.client_id, x.entite_id);
  perform private.btp_exiger_planning(i.client_id, i.entite_id);
  perform private.btp_exiger_fonction(x.client_id, 'meteo');
  if x.statut <> 'prevu' or i.statut <> 'prevu' or not x.exterieur or i.exterieur then
    raise exception 'L''échange se fait entre un passage extérieur et un passage intérieur, tous deux prévus.' using errcode = '23514';
  end if;
  if x.equipe_id is null or x.equipe_id is distinct from i.equipe_id then
    raise exception 'L''échange se fait au sein d''une même équipe de l''entreprise.' using errcode = '23514';
  end if;
  if (x.fin - x.debut) <> (i.fin - i.debut) then
    raise exception 'Les deux passages n''ont pas la même durée : recalez-les plutôt.' using errcode = '23514';
  end if;
  if exists (select 1 from public.btp_dependances d where d.amont_id in (x.id, i.id) or d.aval_id in (x.id, i.id)) then
    raise exception 'Un des passages a des dépendances : recalez le planning plutôt que d''échanger.' using errcode = '23514';
  end if;
  if not coalesce(private.btp_jours_secs(x.id, i.debut, i.fin), false) then
    raise exception 'Les jours du passage intérieur ne sont pas secs pour le passage extérieur.' using errcode = '23514';
  end if;
  update public.btp_passages set debut = i.debut, fin = i.fin where id = x.id;
  update public.btp_passages set debut = x.debut, fin = x.fin where id = i.id;
  perform private.journaliser(x.client_id, 'daliro.ordre_meteo', 'btp_chantiers', x.chantier_id::text,
    jsonb_build_object('exterieur', x.id, 'interieur', i.id, 'exterieur_au', i.debut, 'interieur_au', x.debut,
                       'motif', left(nullif(btrim(p_motif), ''), 300)), x.entite_id);
  return jsonb_build_object('exterieur', x.id, 'exterieur_debut', i.debut, 'interieur', i.id, 'interieur_debut', x.debut);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_jours_secs(uuid, date, date) from public, anon, authenticated;
grant execute on function private.btp_jours_secs(uuid, date, date) to service_role;
revoke execute on function public.btp_ordre_meteo(uuid) from public, anon;
grant execute on function public.btp_ordre_meteo(uuid) to authenticated, service_role;
revoke execute on function public.btp_echanger_passages(uuid, uuid, text) from public, anon;
grant execute on function public.btp_echanger_passages(uuid, uuid, text) to authenticated, service_role;
