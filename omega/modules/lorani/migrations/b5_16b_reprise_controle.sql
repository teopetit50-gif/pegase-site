-- LORANI, lot B5-16b — reprise du contrôle du dossier : b5_16 a été posé (a05f77c, 06/10 16 h 55 Z) avant ses trois
-- amendements de la source (métré contre DPGF ; rôles et natures tenus par des fonctions ; point d'extension). Une
-- table existante ne se refait pas par « create table if not exists » : ce lot porte ces changements sur la base posée.
--
--   1. private.lorani_role_controle_valide / private.lorani_nature_constat_valide : les listes de rôles de pièce et de
--      natures de constat, redéfinissables par CREATE OR REPLACE.
--   2. Contraintes : les nouvelles (suffixe _v2) s'appuient sur ces fonctions, posées NOT VALID puis validées ; les
--      anciennes, à liste fermée, sont retirées — pur élargissement, accord du coordinateur (06/10, 16 h 49 Z), comme
--      pour A2 et A4. Aucune ligne n'est touchée.
--   3. private.lorani_constats_supplementaires : le point d'extension (vide), posé seulement s'il n'existe pas encore,
--      pour ne pas écraser la version de b5_21 si ce lot était rejoué après lui.
--   4. private.lorani_controler : la version de la source (métré contre DPGF, appel du point d'extension).
-- Idempotent. Le test omega/tests/lorani/b5_07_controle_dossier.sql (31 assertions, § 10 = métré) le prouve.


-- Les rôles de pièce et les natures de constat : des fonctions plutôt que des listes fermées dans les CHECK, pour qu'un
-- lot suivant les élargisse par CREATE OR REPLACE (élargir un CHECK demanderait de retirer la contrainte).
CREATE OR REPLACE FUNCTION private.lorani_role_controle_valide(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select p = any (array['planche', 'cctp', 'dpgf', 'plu', 'metre', 'cerfa', 're2020', 'bet', 'notice', 'autre'])
$function$;
CREATE OR REPLACE FUNCTION private.lorani_nature_constat_valide(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select p = any (array['incoherence', 'plu', 'cctp_dpgf', 'metre_dpgf', 're2020', 'accessibilite', 'securite_incendie'])
$function$;
GRANT EXECUTE ON FUNCTION private.lorani_role_controle_valide(text), private.lorani_nature_constat_valide(text) TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_controle_pieces_role_check_v2') then
    alter table public.lorani_controle_pieces add constraint lorani_controle_pieces_role_check_v2 CHECK (private.lorani_role_controle_valide(role)) NOT VALID;
    alter table public.lorani_controle_pieces validate constraint lorani_controle_pieces_role_check_v2;
  end if;
  if exists (select 1 from pg_constraint where conname = 'lorani_controle_pieces_role_check' and conrelid = 'public.lorani_controle_pieces'::regclass) then
    alter table public.lorani_controle_pieces drop constraint lorani_controle_pieces_role_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lorani_constats_nature_check_v2') then
    alter table public.lorani_constats add constraint lorani_constats_nature_check_v2 CHECK (private.lorani_nature_constat_valide(nature)) NOT VALID;
    alter table public.lorani_constats validate constraint lorani_constats_nature_check_v2;
  end if;
  if exists (select 1 from pg_constraint where conname = 'lorani_constats_nature_check' and conrelid = 'public.lorani_constats'::regclass) then
    alter table public.lorani_constats drop constraint lorani_constats_nature_check;
  end if;
end $$;

-- Le point d'extension, sans écraser une version plus riche (b5_21).
DO $$
begin
  if to_regprocedure('private.lorani_constats_supplementaires(uuid)') is null then
    execute $f$
CREATE OR REPLACE FUNCTION private.lorani_constats_supplementaires(p_controle uuid)
 RETURNS TABLE (nature text, gravite text, grandeur text, objet text, signature text, titre text, correction text, article text, valeurs jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::jsonb where false
$function$;
$f$;
    execute 'REVOKE EXECUTE ON FUNCTION private.lorani_constats_supplementaires(uuid) FROM PUBLIC';
  end if;
end $$;

CREATE OR REPLACE FUNCTION private.lorani_controler(p_controle uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
  pr public.lorani_projets;
  e record;
  v_sigs text[] := '{}';
  v_bloquants integer;
  v_total integer;
  v_corriges integer := 0;
  v_reconduits integer := 0;
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found then
    raise exception 'Contrôle inconnu.' using errcode = 'P0002';
  end if;
  select * into pr from public.lorani_projets where id = c.projet_id;
  perform set_config('lorani.controle_en_cours', 'oui', true);

  for e in
    with v as (
      select cp.role, coalesce(cp.reference, p.nom_fichier) as reference, pv.piece_id, pv.champ, pv.valeur #>> '{}' as brut,
             pv.texte, pv.page, pv.boite
      from public.lorani_controle_pieces cp
      join public.pieces p on p.id = cp.piece_id
      join public.pieces_valeurs pv on pv.piece_id = cp.piece_id and pv.chiffre is null
      where cp.controle_id = c.id
    ), m as (
      select v.*, split_part(v.champ, '.', 2) as grandeur, split_part(v.champ, '.', 3) as objet, v.brut::numeric as valeur
      from v
      where v.champ ~ '^mesure\.[a-z0-9_]+\.[a-z0-9_]+$' and v.brut ~ '^-?[0-9]+(\.[0-9]+)?$'
        and private.lorani_grandeur(split_part(v.champ, '.', 2)) is not null
    ), r as (
      select split_part(v.champ, '.', 2) as grandeur, split_part(v.champ, '.', 3) as borne, v.brut::numeric as seuil,
             v.reference, v.page,
             (select a.brut from v a where a.champ = 'regle.' || split_part(v.champ, '.', 2) || '.article' limit 1) as article
      from v
      where v.role = 'plu' and v.champ ~ '^regle\.[a-z0-9_]+\.(max|min)$' and v.brut ~ '^-?[0-9]+(\.[0-9]+)?$'
    ), p_cctp as (
      select distinct on (split_part(v.champ, '.', 2)) split_part(v.champ, '.', 2) as ref, v.brut as intitule, v.reference, v.page, v.texte, v.boite, v.piece_id
      from v where v.role = 'cctp' and v.champ ~ '^poste\.[a-z0-9_]+$' order by split_part(v.champ, '.', 2), v.page
    ), p_dpgf as (
      select distinct on (split_part(v.champ, '.', 2)) split_part(v.champ, '.', 2) as ref, v.brut as quantite, v.reference, v.page, v.texte, v.boite, v.piece_id
      from v where v.role = 'dpgf' and v.champ ~ '^poste\.[a-z0-9_]+$' order by split_part(v.champ, '.', 2), v.page
    ), q_metre as (
      -- les quantités mesurées : le métré s'il y en a un, sinon la somme des planches
      select split_part(v.champ, '.', 2) as ref, sum(v.brut::numeric) as quantite,
             jsonb_agg(jsonb_build_object('piece', v.piece_id, 'reference', v.reference, 'page', v.page, 'boite', v.boite, 'valeur', v.brut::numeric, 'texte', v.texte)
                       order by v.reference, v.page) as valeurs,
             string_agg(format('%s, p. %s', v.reference, coalesce(v.page::text, '?')), ' ; ' order by v.reference, v.page) as sources
      from v
      where v.champ ~ '^quantite\.[a-z0-9_]+$' and v.brut ~ '^[0-9]+(\.[0-9]+)?$'
        and (v.role = 'metre' or (v.role = 'planche' and not exists (select 1 from v w where w.role = 'metre' and w.champ ~ '^quantite\.')))
      group by split_part(v.champ, '.', 2)
    ), q_dpgf as (
      select d.ref, d.quantite::numeric as quantite, d.reference, d.page, d.boite, d.texte, d.piece_id,
             (select u.brut from v u where u.role = 'dpgf' and u.champ = 'unite.' || d.ref limit 1) as unite
      from p_dpgf d where d.quantite ~ '^[0-9]+(\.[0-9]+)?$'
    ), ecarts as (
      select q.ref, q.quantite as mesuree, d.quantite as chiffree, coalesce(' ' || nullif(btrim(d.unite), ''), '') as unite, q.valeurs, q.sources,
             d.reference, d.page, d.boite, d.texte, d.piece_id, round(100 * (d.quantite - q.quantite) / q.quantite) as pct
      from q_metre q join q_dpgf d on d.ref = q.ref
      where q.quantite > 0 and abs(d.quantite - q.quantite) > 0.05 * q.quantite
    ), inc as (
      select m.grandeur, m.objet, max(m.valeur) - min(m.valeur) as ecart,
             mode() within group (order by m.valeur) as frequente,
             jsonb_agg(jsonb_build_object('piece', m.piece_id, 'reference', m.reference, 'page', m.page, 'boite', m.boite,
                                          'valeur', m.valeur, 'texte', m.texte) order by m.reference, m.page) as valeurs,
             string_agg(format('%s sur %s (p. %s)', private.lorani_mesure_texte(m.valeur, m.grandeur), m.reference, coalesce(m.page::text, '?')), ' ; '
                        order by m.reference, m.page) as liste
      from m
      group by m.grandeur, m.objet
      having count(distinct m.piece_id) >= 2
         and max(m.valeur) - min(m.valeur) > (private.lorani_grandeur(m.grandeur) ->> 'tolerance')::numeric
    ), depasse as (
      -- Chaque mesure hors d'une règle du PLU (une marge d'un dixième de la tolérance pour l'arrondi).
      select m.*, r.borne, r.seuil, r.article, r.reference as ref_regle, r.page as page_regle
      from m join r on r.grandeur = m.grandeur
      where m.role <> 'plu'
        and ((r.borne = 'max' and m.valeur > r.seuil + (private.lorani_grandeur(m.grandeur) ->> 'tolerance')::numeric / 10)
          or (r.borne = 'min' and m.valeur < r.seuil - (private.lorani_grandeur(m.grandeur) ->> 'tolerance')::numeric / 10))
    ), hors as (
      -- Un constat par grandeur, objet et borne : la pire valeur est citée, toutes les pièces fautives sont jointes.
      select distinct on (d.grandeur, d.objet, d.borne) d.grandeur, d.objet, d.borne, d.seuil, d.article, d.valeur, d.reference, d.page,
             (select jsonb_agg(jsonb_build_object('piece', x.piece_id, 'reference', x.reference, 'page', x.page, 'boite', x.boite,
                                                  'valeur', x.valeur, 'texte', x.texte) order by x.reference, x.page)
                from depasse x where x.grandeur = d.grandeur and x.objet = d.objet and x.borne = d.borne)
             || jsonb_build_array(jsonb_build_object('reference', d.ref_regle, 'page', d.page_regle, 'valeur', d.seuil, 'borne', d.borne,
                                                     'article', d.article, 'regle', true)) as valeurs
      from depasse d
      order by d.grandeur, d.objet, d.borne, case d.borne when 'max' then -d.valeur else d.valeur end, d.reference
    )
    select 'incoherence' as nature, 'majeur' as gravite, inc.grandeur, inc.objet,
           format('incoherence|%s|%s', inc.grandeur, inc.objet) as signature,
           left(format('%s%s diffère d''une pièce à l''autre : %s.', initcap(left(private.lorani_grandeur(inc.grandeur) ->> 'libelle', 1)) || substr(private.lorani_grandeur(inc.grandeur) ->> 'libelle', 2),
                       private.lorani_objet_de(inc.objet), inc.liste), 300) as titre,
           format('Aligner %s%s sur une seule valeur dans toutes les pièces (écart de %s). Valeur la plus fréquente : %s.',
                  private.lorani_grandeur(inc.grandeur) ->> 'libelle', private.lorani_objet_de(inc.objet), private.lorani_mesure_texte(inc.ecart, inc.grandeur),
                  private.lorani_mesure_texte(inc.frequente, inc.grandeur)) as correction,
           null::text as article, inc.valeurs
    from inc
    union all
    select 'plu', 'bloquant', h.grandeur, h.objet,
           format('plu|%s|%s|%s', h.grandeur, h.objet, h.borne),
           left(format('%s%s (%s sur %s, p. %s) %s la règle du PLU (%s %s%s).',
                       initcap(left(private.lorani_grandeur(h.grandeur) ->> 'libelle', 1)) || substr(private.lorani_grandeur(h.grandeur) ->> 'libelle', 2),
                       private.lorani_objet_de(h.objet), private.lorani_mesure_texte(h.valeur, h.grandeur), h.reference, coalesce(h.page::text, '?'),
                       case h.borne when 'max' then 'dépasse' else 'n''atteint pas' end,
                       case h.borne when 'max' then 'au plus' else 'au moins' end, private.lorani_mesure_texte(h.seuil, h.grandeur),
                       coalesce(', article ' || h.article, '')), 300),
           format('Ramener %s%s à %s %s%s, ou justifier une dérogation.', private.lorani_grandeur(h.grandeur) ->> 'libelle', private.lorani_objet_de(h.objet),
                  case h.borne when 'max' then 'au plus' else 'au moins' end, private.lorani_mesure_texte(h.seuil, h.grandeur),
                  coalesce(' (article ' || h.article || ' du règlement)', '')),
           h.article, h.valeurs
    from hors h
    union all
    select 'cctp_dpgf', 'mineur', null, x.ref, format('cctp_dpgf|cctp|%s', x.ref),
           left(format('Le poste %s « %s » est décrit au CCTP (%s, p. %s) mais n''est pas chiffré à la DPGF.', replace(x.ref, '_', '.'),
                       left(coalesce(x.intitule, ''), 80), x.reference, coalesce(x.page::text, '?')), 300),
           format('Ajouter le poste %s à la DPGF, ou le retirer du CCTP.', replace(x.ref, '_', '.')),
           null, jsonb_build_array(jsonb_build_object('piece', x.piece_id, 'reference', x.reference, 'page', x.page, 'boite', x.boite, 'valeur', x.intitule, 'texte', x.texte))
    from p_cctp x
    where exists (select 1 from p_dpgf) and not exists (select 1 from p_dpgf d where d.ref = x.ref)
    union all
    select 'cctp_dpgf', 'mineur', null, d.ref, format('cctp_dpgf|dpgf|%s', d.ref),
           left(format('Le poste %s est chiffré à la DPGF (%s, p. %s) sans description au CCTP.', replace(d.ref, '_', '.'), d.reference, coalesce(d.page::text, '?')), 300),
           format('Décrire le poste %s au CCTP, ou le retirer de la DPGF.', replace(d.ref, '_', '.')),
           null, jsonb_build_array(jsonb_build_object('piece', d.piece_id, 'reference', d.reference, 'page', d.page, 'boite', d.boite, 'valeur', d.quantite, 'texte', d.texte))
    from p_dpgf d
    where exists (select 1 from p_cctp) and not exists (select 1 from p_cctp x where x.ref = d.ref)
    union all
    select 'metre_dpgf', case when x.chiffree < 0.9 * x.mesuree then 'majeur' else 'mineur' end, null, x.ref, format('metre_dpgf|%s', x.ref),
           left(format('Le poste %s est chiffré à %s%s à la DPGF (%s, p. %s) pour %s%s mesurés (%s) : %s de %s %%.', replace(x.ref, '_', '.'),
                       private.lorani_mesure_texte(x.chiffree, null), x.unite, x.reference, coalesce(x.page::text, '?'),
                       private.lorani_mesure_texte(x.mesuree, null), x.unite, x.sources,
                       case when x.chiffree < x.mesuree then 'sous-estimé' else 'surestimé' end, abs(x.pct)), 300),
           format('Porter la quantité du poste %s à %s%s à la DPGF, ou justifier l''écart.', replace(x.ref, '_', '.'), private.lorani_mesure_texte(x.mesuree, null), x.unite),
           null, x.valeurs || jsonb_build_array(jsonb_build_object('piece', x.piece_id, 'reference', x.reference, 'page', x.page, 'boite', x.boite, 'valeur', x.chiffree, 'texte', x.texte))
    from ecarts x
    union all
    select s.nature, s.gravite, s.grandeur, s.objet, s.signature, s.titre, s.correction, s.article, s.valeurs
    from private.lorani_constats_supplementaires(c.id) s
  loop
    v_sigs := v_sigs || e.signature;
    insert into public.lorani_constats (client_id, entite_id, projet_id, controle_id, nature, gravite, grandeur, objet, signature, titre,
                                        correction, article, valeurs)
    values (c.client_id, c.entite_id, c.projet_id, c.id, e.nature, e.gravite, e.grandeur, e.objet, e.signature, e.titre,
            e.correction, e.article, e.valeurs)
    on conflict on constraint lorani_constats_une_fois do update
      set titre = excluded.titre, correction = excluded.correction, article = excluded.article, valeurs = excluded.valeurs,
          statut = case when lorani_constats.statut = 'corrige' then 'ouvert' else lorani_constats.statut end;
  end loop;

  -- Un constat de ce contrôle qui ne se retrouve plus au nouveau passage : corrigé.
  update public.lorani_constats k set statut = 'corrige', motif = 'Ne se retrouve plus au dernier passage du contrôle.'
  where k.controle_id = c.id and k.statut = 'ouvert' and not (k.signature = any (v_sigs));

  -- Revérification à l'indice suivant.
  if c.precedent_id is not null then
    with reconduits as (
      update public.lorani_constats n
         set precedent_id = o.id,
             statut = case when o.statut in ('accepte', 'ecarte') and n.statut = 'ouvert' then o.statut else n.statut end,
             motif = case when o.statut in ('accepte', 'ecarte') and n.statut = 'ouvert' then o.motif else n.motif end
        from public.lorani_constats o
       where n.controle_id = c.id and o.controle_id = c.precedent_id and o.signature = n.signature
      returning n.id
    ) select count(*) into v_reconduits from reconduits;
    with corriges as (
      update public.lorani_constats o
         set statut = 'corrige', corrige_au_controle = c.id,
             motif = format('Corrigé à l''indice %s.', c.indice)
       where o.controle_id = c.precedent_id and o.statut = 'ouvert' and not (o.signature = any (v_sigs))
      returning o.id
    ) select count(*) into v_corriges from corriges;
  end if;

  select count(*) filter (where k.statut = 'ouvert' and k.gravite = 'bloquant'), count(*) filter (where k.statut = 'ouvert')
    into v_bloquants, v_total
  from public.lorani_constats k where k.controle_id = c.id;
  update public.lorani_controles set statut = case when statut = 'clos' then 'clos' else 'controle' end, lance_le = now(),
         constats_nb = v_total where id = c.id;

  perform private.lever_alerte_module(c.client_id, 'lorani', case when v_bloquants > 0 then 'attention' else 'info' end,
    left(format('« %s » : contrôle « %s » (indice %s) passé, %s constat%s ouvert%s dont %s bloquant%s%s.', left(pr.nom, 50), left(c.intitule, 50), c.indice,
                v_total, case when v_total > 1 then 's' else '' end, case when v_total > 1 then 's' else '' end,
                v_bloquants, case when v_bloquants > 1 then 's' else '' end,
                case when v_corriges > 0 then format(' ; %s corrigé%s depuis l''indice précédent', v_corriges, case when v_corriges > 1 then 's' else '' end) else '' end), 200),
    jsonb_build_object('projet', c.projet_id, 'controle', c.id, 'constats', v_total, 'bloquants', v_bloquants, 'corriges', v_corriges,
                       'lien', private.lorani_lien_projet(c.projet_id)),
    format('controle:%s', c.id), true, private.lorani_chef_de_projet(c.client_id, c.projet_id));
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.controle_passe', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('controle', c.id, 'indice', c.indice, 'constats', v_total, 'bloquants', v_bloquants, 'corriges', v_corriges,
                       'reconduits', v_reconduits), c.entite_id);
  perform set_config('lorani.controle_en_cours', '', true);
  return jsonb_build_object('controle', c.id, 'constats', v_total, 'bloquants', v_bloquants, 'corriges', v_corriges, 'reconduits', v_reconduits);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controler(uuid) FROM PUBLIC;
