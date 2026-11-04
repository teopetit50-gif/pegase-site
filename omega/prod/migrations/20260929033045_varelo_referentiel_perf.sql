-- 20260929033045 varelo_referentiel_perf
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
create or replace function private.grp_territoire_cp(p_cp text) returns text
language plpgsql stable parallel safe set search_path = '' as $$
begin
  if p_cp is null or p_cp !~ '^[0-9]{5}$' then
    return null;
  elsif p_cp = '97133' then
    return public.territoire_calendrier('BL');
  elsif p_cp = '97150' then
    return public.territoire_calendrier('MF');
  elsif left(p_cp, 2) in ('97', '98') then
    return public.territoire_calendrier('FR-' || left(p_cp, 3));
  elsif left(p_cp, 2) in ('57', '67', '68') then
    return 'alsace-moselle';
  end if;
  return 'metropole';
end $$;
create or replace function private.grp_trigrammes(p text) returns text[]
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  r text[] := '{}';
  m text;
  w text;
  t text;
  i integer;
begin
  foreach m in array string_to_array(coalesce(p, ''), ' ') loop
    continue when m = '';
    w := '  ' || m || ' ';
    for i in 1 .. char_length(m) + 1 loop
      t := substr(w, i, 3);
      if not (t = any (r)) then
        r := r || t;
      end if;
    end loop;
  end loop;
  return r;
end $$;
create or replace function private.grp_jaccard(ta text[], tb text[]) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  t text;
  n integer := 0;
begin
  if coalesce(cardinality(ta), 0) = 0 or coalesce(cardinality(tb), 0) = 0 then
    return 0;
  end if;
  foreach t in array ta loop
    if t = any (tb) then
      n := n + 1;
    end if;
  end loop;
  return round(n::numeric / (cardinality(ta) + cardinality(tb) - n), 3);
end $$;
create or replace function private.grp_similarite_trigrammes(a text, b text) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
begin
  return private.grp_jaccard(private.grp_trigrammes(a), private.grp_trigrammes(b));
end $$;
create or replace function private.grp_similarite_jetons(a text[], b text[]) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
declare
  na integer := coalesce(cardinality(a), 0);
  nb integer := coalesce(cardinality(b), 0);
  s numeric[];
  pris_a boolean[];
  pris_b boolean[];
  v_somme numeric := 0;
  v_max numeric;
  bi integer;
  bj integer;
  i integer;
  j integer;
begin
  if na = 0 or nb = 0 then
    return 0;
  end if;
  s := array_fill(0::numeric, array[na * nb]);
  for i in 1 .. na loop
    for j in 1 .. nb loop
      s[(i - 1) * nb + j] := private.grp_ressemblance_mots(a[i], b[j]);
    end loop;
  end loop;
  pris_a := array_fill(false, array[na]);
  pris_b := array_fill(false, array[nb]);
  loop
    v_max := 0;
    bi := 0;
    for i in 1 .. na loop
      continue when pris_a[i];
      for j in 1 .. nb loop
        continue when pris_b[j];
        if s[(i - 1) * nb + j] > v_max then
          v_max := s[(i - 1) * nb + j];
          bi := i;
          bj := j;
        end if;
      end loop;
    end loop;
    exit when bi = 0;
    v_somme := v_somme + v_max;
    pris_a[bi] := true;
    pris_b[bj] := true;
  end loop;
  return round((v_somme / na + v_somme / nb) / 2, 3);
end $$;
create or replace function private.grp_similarite_noms(a text[], b text[]) returns numeric
language plpgsql immutable parallel safe set search_path = '' as $$
begin
  return greatest(private.grp_similarite_jetons(a, b),
                  private.grp_similarite_trigrammes(array_to_string(a, ' '), array_to_string(b, ' ')));
end $$;
create or replace function private.grp_iban_partage(p_client uuid, p_empreinte text) returns integer
language plpgsql stable security definer set search_path = '' as $$
begin
  return (select count(distinct coalesce(x.siren, x.nom_normalise))::integer
          from public.grp_ref_codes x
          where x.client_id = p_client and x.nature = 'fournisseur' and x.iban_empreinte = p_empreinte);
end $$;
create or replace function private.grp_fournisseur_de(p_client uuid, p_entite uuid, p_code text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_code is null then
    return null;
  end if;
  return (select f.objet_id from public.grp_ref_codes f
          where f.client_id = p_client and f.entite_id = p_entite and f.nature = 'fournisseur' and f.code_local = p_code);
end $$;
create or replace function private.grp_code_compatible(p_code uuid, p_objet uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return not exists (
    select 1 from public.grp_ref_codes c, public.grp_ref_codes y
    where c.id = p_code and y.objet_id = p_objet and y.id <> c.id
      and ((c.siren is not null and y.siren is not null and y.siren <> c.siren)
        or (c.gtin is not null and y.gtin is not null and y.gtin <> c.gtin)
        or (c.tva is not null and y.tva is not null and y.tva <> c.tva)));
end $$;
create or replace function private.grp_objets_compatibles(p_a uuid, p_b uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return not exists (
      select 1 from public.grp_ref_codes a, public.grp_ref_codes b
      where a.objet_id = p_a and b.objet_id = p_b
        and ((a.siren is not null and b.siren is not null and a.siren <> b.siren)
          or (a.gtin is not null and b.gtin is not null and a.gtin <> b.gtin)
          or (a.tva is not null and b.tva is not null and a.tva <> b.tva)))
    and not exists (
      select 1 from public.grp_ref_objets oa, public.grp_ref_objets ob
      where oa.id = p_a and ob.id = p_b and oa.entite_id is not null and ob.entite_id is not null and oa.entite_id <> ob.entite_id);
end $$;
create or replace function private.grp_iban_differents(p_a uuid, p_b uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (select 1 from public.grp_ref_codes a where a.objet_id = p_a and a.iban_empreinte is not null)
     and exists (select 1 from public.grp_ref_codes b where b.objet_id = p_b and b.iban_empreinte is not null)
     and not exists (select 1 from public.grp_ref_codes a, public.grp_ref_codes b
                     where a.objet_id = p_a and b.objet_id = p_b and a.iban_empreinte = b.iban_empreinte);
end $$;
create or replace function private.grp_empreinte_codes(p_cle text, p_codes uuid[]) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  return encode(sha256(convert_to(p_cle || ':' || coalesce(
    (select string_agg(c.empreinte, ',' order by c.id) from public.grp_ref_codes c where c.id = any (p_codes)), ''), 'UTF8')), 'hex');
end $$;
create or replace function private.grp_proposer_aretes(p_client uuid, p_inst public.grp_installations, p_complet boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  a record;
  v_sources uuid[];
  v_cibles uuid[];
  v_codes uuid[];
  v_cle text;
  v_empreinte text;
  v_haut numeric := p_inst.seuil_sur - 0.001;
  v_rare integer := least(p_inst.bloc_max, 40);
  n_sures integer := 0;
  n_probables integer := 0;
  n_memoire integer := 0;
  n_gros integer;
begin
  select coalesce(array_agg(distinct pr.objet_source), '{}') into v_sources
  from public.grp_ref_propositions pr
  where pr.client_id = p_client and pr.statut = 'a_valider' and pr.genre in ('deplacer', 'fusionner');
  select coalesce(array_agg(distinct pr.objet_cible), '{}') into v_cibles
  from public.grp_ref_propositions pr
  where pr.client_id = p_client and pr.statut = 'a_valider' and pr.genre in ('placer', 'deplacer', 'fusionner');

  create temporary table if not exists pg_temp.grp_cles_blocage (id uuid, nature text, objet_id uuid, cle text, precise boolean)
    on commit drop;
  truncate pg_temp.grp_cles_blocage;
  insert into pg_temp.grp_cles_blocage
  select c.id, c.nature, c.objet_id, k.cle, k.precise
  from public.grp_ref_codes c
  cross join lateral (
    select 'm:' || j, false from unnest(c.jetons) as j where char_length(j) >= 3 and j !~ '^[0-9.]+$'
    union all
    select 'mc:' || j || ':' || c.code_postal, true from unnest(c.jetons) as j
    where c.code_postal is not null and char_length(j) >= 3 and j !~ '^[0-9.]+$'
    union all
    select 'bc:' || c.bloc || ':' || c.code_postal, true where c.bloc is not null and c.code_postal is not null
    union all
    select 't:' || c.telephone_cle, true where c.telephone_cle is not null
    union all
    select 'd:' || c.domaine_email, true where c.domaine_email is not null
  ) as k(cle, precise)
  where c.client_id = p_client and c.actif and c.etat in ('nouveau', 'confirme');
  analyze pg_temp.grp_cles_blocage;
  select count(*) into n_gros from (
    select 1 from pg_temp.grp_cles_blocage k group by k.nature, k.cle, k.precise
    having count(*) > case when k.precise then p_inst.bloc_max else v_rare end) g;

  for a in
    with terr as (
      select s.entite_id, private.territoire_de_entite(s.client_id, s.entite_id) as t
      from public.grp_societes s where s.client_id = p_client
    ),
    taille as (
      select o.id, o.numero, o.nature, o.intragroupe, count(y.id) as nb, count(y.id) filter (where y.etat = 'propose') as nb_propose
      from public.grp_ref_objets o left join public.grp_ref_codes y on y.objet_id = o.id
      where o.client_id = p_client and o.statut = 'actif'
      group by o.id
    ),
    e as (
      select c.* from public.grp_ref_codes c
      where c.client_id = p_client and c.actif and c.etat in ('nouveau', 'confirme') and (p_complet or c.a_rapprocher)
    ),
    cles_utiles as (
      select k.id, k.nature, k.objet_id, k.cle
      from pg_temp.grp_cles_blocage k
      join (select k2.nature, k2.cle, count(*) as n, bool_or(k2.precise) as precise
            from pg_temp.grp_cles_blocage k2 group by k2.nature, k2.cle) f on f.nature = k.nature and f.cle = k.cle
      where f.n between 2 and case when f.precise then p_inst.bloc_max else v_rare end
    ),
    candidats as (
      select distinct ke.id as e_id, kx.id as x_id
      from cles_utiles ke
      join e on e.id = ke.id
      join cles_utiles kx on kx.nature = ke.nature and kx.cle = ke.cle and kx.objet_id <> ke.objet_id
      where not exists (select 1 from e e2 where e2.id = kx.id and kx.id < ke.id)
    ),
    sures as (
      select e.id as c_id, e.objet_id as c_obj, b.objet_id as x_obj, b.preuves, 'sure'::text as preuve, b.regle,
             1.000::numeric as score, jsonb_build_array(jsonb_build_object('critere', b.regle, 'valeur', b.valeur)) as raisons
      from e cross join lateral private.grp_preuves_sures(e.id, p_inst.iban_partage_max) b
    ),
    paires as (
      select e.id as c_id, e.objet_id as c_obj, x.id as x_id, x.objet_id as x_obj, e.nature,
             e.jetons as ja, x.jetons as jb, e.code_postal as cpa, x.code_postal as cpb,
             e.adresse_normalisee as aa, x.adresse_normalisee as ab, e.telephone_cle as ta, x.telephone_cle as tb,
             e.domaine_email as da, x.domaine_email as db,
             coalesce(private.grp_territoire_cp(e.code_postal), te.t) as terra,
             coalesce(private.grp_territoire_cp(x.code_postal), tx.t) as terrb, e.unite as ua, x.unite as ub,
             case when e.nature = 'article' then private.grp_fournisseur_de(e.client_id, e.entite_id, e.fournisseur_code) end as fa,
             case when e.nature = 'article' then private.grp_fournisseur_de(x.client_id, x.entite_id, x.fournisseur_code) end as fb
      from candidats k
      join e on e.id = k.e_id
      join public.grp_ref_codes x on x.id = k.x_id
      join terr te on te.entite_id = e.entite_id
      join terr tx on tx.entite_id = x.entite_id
      where not (e.siren is not null and x.siren is not null and e.siren <> x.siren)
        and not (e.tva is not null and x.tva is not null and e.tva <> x.tva)
        and not (e.gtin is not null and x.gtin is not null and e.gtin <> x.gtin)
    ),
    probables as (
      select p.c_id, p.c_obj, p.x_obj, array[p.x_id] as preuves, 'probable'::text as preuve, 'similarite'::text as regle,
             least(s.score, v_haut) as score,
             s.raisons || case when s.score > v_haut
                               then jsonb_build_array(jsonb_build_object('critere', 'plafond', 'detail',
                                      'sans identifiant commun, un rapprochement n''est jamais sûr'))
                               else '[]'::jsonb end as raisons
      from paires p
      cross join lateral (
        select t.score, t.raisons
        from private.grp_score_tiers(p.ja, p.jb, p.cpa, p.cpb, p.aa, p.ab, p.ta, p.tb, p.da, p.db, p.terra, p.terrb) t
        where p.nature <> 'article'
        union all
        select t.score, t.raisons
        from private.grp_score_article(p.ja, p.jb, p.ua, p.ub,
               (select tf.id from taille tf where tf.id = p.fa and not tf.intragroupe),
               (select tf.id from taille tf where tf.id = p.fb and not tf.intragroupe)) t
        where p.nature = 'article'
      ) s
      where s.score >= p_inst.seuil_probable
    ),
    aretes as (
      select * from sures
      union all
      select * from probables
    ),
    orientees as (
      select ar.*, (tx.nb > tc.nb or (tx.nb = tc.nb and tx.numero < tc.numero)) as vers_x,
             tc.nb as nb_c, tx.nb as nb_x, tc.nb_propose as prop_c, tx.nb_propose as prop_x, tc.numero as num_c, tx.numero as num_x
      from aretes ar join taille tc on tc.id = ar.c_obj join taille tx on tx.id = ar.x_obj
    ),
    tournees as (
      select case when o.vers_x then o.c_obj else o.x_obj end as source,
             case when o.vers_x then o.x_obj else o.c_obj end as cible,
             case when o.vers_x then o.c_id else o.preuves[1] end as code_source,
             case when o.vers_x then o.preuves else array[o.c_id] end as preuves_cible,
             case when o.vers_x then o.nb_c else o.nb_x end as nb_source,
             case when o.vers_x then o.prop_c else o.prop_x end as prop_source,
             case when o.vers_x then o.nb_x else o.nb_c end as nb_cible,
             case when o.vers_x then o.num_x else o.num_c end as num_cible,
             o.preuve, o.regle, o.score, o.raisons
      from orientees o
    ),
    uniques as (
      select distinct on (least(u.source, u.cible), greatest(u.source, u.cible)) u.*
      from tournees u
      order by least(u.source, u.cible), greatest(u.source, u.cible), (u.preuve = 'sure') desc, u.score desc, u.code_source
    )
    select u.*, o.nature from uniques u join public.grp_ref_objets o on o.id = u.source
    where u.prop_source = 0 and private.grp_objets_compatibles(u.source, u.cible)
    order by (u.preuve = 'sure') desc, u.nb_cible desc, u.num_cible asc, u.score desc, u.source
  loop
    continue when a.source = any (v_sources) or a.source = any (v_cibles) or a.cible = any (v_sources);
    if a.nb_source = 1 then
      v_cle := 'c:' || a.code_source::text || '>' || a.cible::text;
      v_codes := array[a.code_source];
    else
      v_cle := 'o:' || least(a.source, a.cible)::text || '|' || greatest(a.source, a.cible)::text;
      select array_agg(y.id) into v_codes from public.grp_ref_codes y where y.objet_id in (a.source, a.cible);
    end if;
    v_empreinte := private.grp_empreinte_codes(v_cle, v_codes);
    if exists (select 1 from public.grp_ref_propositions q where q.client_id = p_client and q.cle_paire = v_cle
               and q.empreinte = v_empreinte and q.statut in ('rejetee', 'ecartee')) then
      n_memoire := n_memoire + 1;
      continue;
    end if;
    insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, objet_source, objet_cible,
                                             regle, score, raisons, preuves, cle_paire, empreinte)
    values (p_client, a.nature, case when a.nb_source = 1 then 'deplacer' else 'fusionner' end, a.preuve,
            case when a.nature = 'fournisseur' and private.grp_iban_differents(a.source, a.cible) then 'rattacher_iban_different'
                 when a.preuve = 'sure' then 'rattacher_codes' else 'rapprocher_codes' end,
            a.code_source, a.source, a.cible, a.regle, a.score, a.raisons, a.preuves_cible, v_cle, v_empreinte);
    v_sources := v_sources || a.source;
    v_cibles := v_cibles || a.cible;
    if a.preuve = 'sure' then n_sures := n_sures + 1; else n_probables := n_probables + 1; end if;
  end loop;
  return jsonb_build_object('propositions_sures', n_sures, 'propositions_probables', n_probables,
                            'refus_gardes', n_memoire, 'blocs_trop_gros', n_gros);
end $$;
revoke all on function private.grp_territoire_cp(text) from public, anon, authenticated;
revoke all on function private.grp_jaccard(text[], text[]) from public, anon, authenticated;
