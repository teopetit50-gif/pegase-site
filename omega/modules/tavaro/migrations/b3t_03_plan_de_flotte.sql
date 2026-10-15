-- b3t_03 — Le plan de flotte (renfort B3 sur Tavaro, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/location promet, module n° 20 « Plan de flotte » : « Le plan de flotte de
-- l'an prochain indique, agence par agence, les véhicules à acheter, renouveler, vendre ou déplacer. » Rien ne le
-- calculait.
--
-- LE CALCUL, par agence et par catégorie, sur les douze derniers mois (p_mois) :
--   · flotte : les véhicules actifs de la catégorie à l'agence (où leur dernier contrat les a rendus) ;
--   · jours loués : les jours de contrat partis de l'agence, dans la période ;
--   · utilisation = jours loués / (flotte × jours de la période) ;
--   · pic : le 95e centile du nombre de contrats en cours, jour par jour (on ne dimensionne pas sur le seul jour le
--     plus chargé de l'année) ;
--   · cible = le plus grand de : le pic, et ce qu'il faut pour louer les mêmes jours à l'utilisation visée (p_cible,
--     80 % par défaut) ;
--   · écart = cible − flotte. Les excédents d'une agence couvrent d'abord les manques d'une autre agence dans la même
--     catégorie (« déplacer »), le plus gros manque d'abord ; ce qui manque encore est « à acheter », ce qui reste en
--     trop est « à vendre » (les plus anciens, puis les plus kilométrés) ;
--   · à renouveler : parmi ceux qu'on garde, ceux qui auront quatre ans ou plus au 1er janvier de l'an prochain, ou
--     120 000 km ou plus.
--   Chaque ligne dit ses chiffres ; rien n'est décidé à la place de la direction.
--
-- CE QUE ÇA POSE : public.loc_plan_de_flotte(p_client, p_mois int = 12, p_cible numeric = 0.80) → jsonb, réservé au
-- gérant et à l'admin (la flotte du réseau entier). Lecture seule ; idempotent (create or replace, grant).

create or replace function private.loc_plan_de_flotte_calc(p_client uuid, p_mois integer default 12, p_cible numeric default 0.80,
                                                            p_maintenant timestamp with time zone default now())
 returns jsonb
 language plpgsql
 security definer   -- volatile : une table temporaire de travail (on commit drop)
 set search_path to ''
as $function$
declare
  v_debut date := (p_maintenant - make_interval(months => p_mois))::date;
  v_fin date := p_maintenant::date;
  v_jours integer := greatest((p_maintenant::date - (p_maintenant - make_interval(months => p_mois))::date), 1);
  v_annee integer := extract(year from p_maintenant)::integer + 1;
  v_lignes jsonb := '[]'::jsonb;
  cat record;
  ag record;
  v_surplus jsonb;
  v_manques jsonb;
  s jsonb;
  m jsonb;
  k integer;
  v_dep jsonb := '[]'::jsonb;
  r record;
  v_res jsonb;
begin
  -- 1. Les chiffres bruts par agence et par catégorie.
  create temporary table if not exists b3t_plan (
    entite_id uuid, categorie_id uuid, flotte integer, jours_loues numeric, utilisation numeric, pic numeric, cible integer,
    ecart integer, deplacer_out integer default 0, deplacer_in integer default 0, acheter integer default 0, vendre integer default 0
  ) on commit drop;
  truncate b3t_plan;
  insert into b3t_plan (entite_id, categorie_id, flotte, jours_loues, pic)
  with flotte as (
    select private.loc_b3t_position(v.client_id, v.id, v.entite_id) as entite_id, v.categorie_id, count(*)::integer as n
    from public.loc_vehicules v
    where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id is not null
    group by 1, 2
  ),
  contrats as (
    select c.entite_id, coalesce(v.categorie_id, c.categorie_id) as categorie_id,
           greatest(c.depart_le::date, v_debut) as du,
           least(coalesce(c.retour_reel_le, greatest(c.retour_prevu_le, p_maintenant))::date, v_fin) as au
    from public.loc_contrats c
    left join public.loc_vehicules v on v.client_id = c.client_id and v.id = c.vehicule_id
    where c.client_id = p_client and c.disparu_le is null and c.statut <> 'annule'
      and c.depart_le::date <= v_fin and coalesce(c.retour_reel_le, greatest(c.retour_prevu_le, p_maintenant))::date >= v_debut
      and coalesce(v.categorie_id, c.categorie_id) is not null
  ),
  usage as (
    select x.entite_id, x.categorie_id, sum(greatest(x.au - x.du, 0) + 1)::numeric as jours from contrats x group by 1, 2
  ),
  jours as (
    select x.entite_id, x.categorie_id, d.d, count(*) as n
    from contrats x cross join lateral generate_series(x.du, x.au, interval '1 day') d(d)
    group by 1, 2, 3
  ),
  pics as (
    -- les jours sans aucun contrat comptent pour zéro : on complète le centile avec eux
    select j.entite_id, j.categorie_id,
           (select percentile_cont(0.95) within group (order by z.n)
              from (select jj.n from jours jj where jj.entite_id = j.entite_id and jj.categorie_id = j.categorie_id
                    union all select 0 from generate_series(1, greatest(v_jours + 1 - (select count(*) from jours j2
                                                                                          where j2.entite_id = j.entite_id and j2.categorie_id = j.categorie_id)::integer, 0))) z) as p95
    from (select distinct entite_id, categorie_id from jours) j
  ),
  cles as (select entite_id, categorie_id from flotte union select entite_id, categorie_id from usage)
  select k.entite_id, k.categorie_id, coalesce(f.n, 0), coalesce(u.jours, 0), coalesce(p.p95, 0)
  from cles k
  left join flotte f on f.entite_id = k.entite_id and f.categorie_id = k.categorie_id
  left join usage u on u.entite_id = k.entite_id and u.categorie_id = k.categorie_id
  left join pics p on p.entite_id = k.entite_id and p.categorie_id = k.categorie_id
  where k.entite_id is not null
    and exists (select 1 from public.loc_agences a where a.client_id = p_client and a.entite_id = k.entite_id and a.actif);

  update b3t_plan set
    utilisation = case when flotte > 0 then round(jours_loues / (flotte * (v_jours + 1)), 3) end,
    cible = greatest(ceil(pic)::integer, ceil(jours_loues / ((v_jours + 1) * p_cible))::integer);
  update b3t_plan set ecart = cible - flotte;

  -- 2. Déplacer avant d'acheter : dans chaque catégorie, les excédents couvrent les manques, le plus gros d'abord.
  for cat in select distinct categorie_id from b3t_plan loop
    for m in select to_jsonb(x) from b3t_plan x where x.categorie_id = cat.categorie_id and x.ecart > 0 order by x.ecart desc, x.entite_id loop
      k := (m ->> 'ecart')::integer;
      for s in select to_jsonb(y) from b3t_plan y where y.categorie_id = cat.categorie_id and y.ecart - y.deplacer_out < 0
                 order by (y.ecart - y.deplacer_out), y.entite_id loop
        exit when k <= 0;
        declare n_dep integer := least(k, -((s ->> 'ecart')::integer - (s ->> 'deplacer_out')::integer));
        begin
          continue when n_dep <= 0;
          update b3t_plan set deplacer_out = deplacer_out + n_dep where entite_id = (s ->> 'entite_id')::uuid and categorie_id = cat.categorie_id;
          update b3t_plan set deplacer_in = deplacer_in + n_dep where entite_id = (m ->> 'entite_id')::uuid and categorie_id = cat.categorie_id;
          v_dep := v_dep || jsonb_build_object('categorie_id', cat.categorie_id, 'de', s ->> 'entite_id', 'vers', m ->> 'entite_id', 'n', n_dep);
          k := k - n_dep;
        end;
      end loop;
    end loop;
  end loop;
  update b3t_plan set acheter = greatest(ecart - deplacer_in, 0), vendre = greatest(-ecart - deplacer_out, 0);

  -- 3. Le détail, agence par agence.
  for ag in
    select a.entite_id, a.code, e.nom from public.loc_agences a join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where a.client_id = p_client and a.actif order by a.code
  loop
    v_lignes := v_lignes || jsonb_build_object('entite_id', ag.entite_id, 'agence', ag.code, 'nom', ag.nom, 'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
               'categorie_id', p.categorie_id, 'categorie', k.code, 'libelle', k.libelle,
               'flotte', p.flotte, 'jours_loues', p.jours_loues, 'utilisation', p.utilisation, 'pic', round(p.pic, 1), 'cible', p.cible,
               'acheter', p.acheter, 'vendre', p.vendre,
               'deplacer', coalesce((select jsonb_agg(jsonb_build_object('vers', (select a2.code from public.loc_agences a2 where a2.client_id = p_client and a2.entite_id = (d ->> 'vers')::uuid), 'n', (d ->> 'n')::integer))
                                     from jsonb_array_elements(v_dep) d where (d ->> 'de')::uuid = p.entite_id and (d ->> 'categorie_id')::uuid = p.categorie_id), '[]'::jsonb),
               'recevoir', p.deplacer_in,
               'a_vendre', coalesce((select jsonb_agg(x.immatriculation) from (
                   select v.immatriculation from public.loc_vehicules v
                   where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id = p.categorie_id
                     and private.loc_b3t_position(v.client_id, v.id, v.entite_id) = p.entite_id
                   order by v.mise_en_circulation nulls last, v.km_dernier desc nulls last, v.immatriculation limit p.vendre) x), '[]'::jsonb),
               'renouveler', (select count(*) from (
                   select v.mise_en_circulation, v.km_dernier from public.loc_vehicules v
                   where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id = p.categorie_id
                     and private.loc_b3t_position(v.client_id, v.id, v.entite_id) = p.entite_id
                   order by v.mise_en_circulation nulls last, v.km_dernier desc nulls last, v.immatriculation offset p.vendre) g
                 where (g.mise_en_circulation is not null and g.mise_en_circulation <= make_date(v_annee - 4, 1, 1)) or coalesce(g.km_dernier, 0) >= 120000),
               'raison', format('%s véhicule(s), utilisés à %s %% ; %s en cours au plus fort (95e centile) ; il en faut %s',
                                p.flotte, coalesce(round(p.utilisation * 100)::text, '—'), replace(round(p.pic, 1)::text, '.', ','), p.cible))
             order by k.rang nulls last, k.code)
      from b3t_plan p join public.loc_categories k on k.client_id = p_client and k.id = p.categorie_id
      where p.entite_id = ag.entite_id), '[]'::jsonb));
  end loop;

  select jsonb_build_object('acheter', coalesce(sum(acheter), 0), 'vendre', coalesce(sum(vendre), 0), 'deplacer', coalesce(sum(deplacer_out), 0))
    into v_res from b3t_plan;
  v_res := v_res || jsonb_build_object('renouveler', (select coalesce(sum((c ->> 'renouveler')::integer), 0)
                                                     from jsonb_array_elements(v_lignes) a, jsonb_array_elements(a -> 'categories') c));
  return jsonb_build_object('annee', v_annee, 'periode', jsonb_build_object('du', v_debut, 'au', v_fin, 'mois', p_mois),
                            'cible_utilisation', p_cible, 'agences', v_lignes, 'totaux', v_res);
end $function$;

create or replace function public.loc_plan_de_flotte(p_client uuid, p_mois integer default 12, p_cible numeric default 0.80)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin']);
  if p_mois is null or p_mois not between 3 and 36 then
    raise exception 'La période va de 3 à 36 mois.' using errcode = '22023';
  end if;
  if p_cible is null or p_cible not between 0.30 and 1 then
    raise exception 'L''utilisation visée va de 30 %% à 100 %%.' using errcode = '22023';
  end if;
  return private.loc_plan_de_flotte_calc(p_client, p_mois, p_cible, now());
end $function$;

revoke all on function public.loc_plan_de_flotte(uuid, integer, numeric) from public, anon;
grant execute on function public.loc_plan_de_flotte(uuid, integer, numeric) to authenticated, service_role;
revoke all on function private.loc_plan_de_flotte_calc(uuid, integer, numeric, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_plan_de_flotte_calc(uuid, integer, numeric, timestamp with time zone) to service_role;

select 'b3t_03 plan de flotte posé' as resultat;
