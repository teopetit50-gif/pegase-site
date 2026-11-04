-- 20261015124627 b5_31_regler_controles
-- Source : dépôt : 839f669 omega/modules/lorani/migrations/b5_31_regler_controles.sql ; 6033be8 omega/modules/daliro/migrations/b6_33_devis_pdf.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b5_31_regler_controles.sql @ 839f669, b6_33_devis_pdf.sql @ 6033be8 ; b5_20 cité comme test : ignoré.
-- ═══ omega/modules/lorani/migrations/b5_31_regler_controles.sql @ 839f669
-- LORANI, lot B5-31 — régler les contrôles d'un projet : tolérances et familles de contrôle (15/10/2026).
--
-- Pourquoi : la page des architectes montre, dans le menu du produit, « Régler les contrôles » (Produit.tsx:286 ;
-- chiffrage, ligne 15 : C). Les tolérances étaient fixées dans le code (5 cm sur une hauteur, 0,5 m² sur une surface,
-- 5 % entre métré et DPGF) et toutes les familles de contrôle tournaient sur tous les projets.
--
-- Ce qui est posé :
--   · lorani_projets.controle_tolerances jsonb : par grandeur (« hauteur_faitage_m » : 0.10), l'écart toléré, et
--     « metre_dpgf_pct » (1 à 50) : l'écart toléré entre métré et DPGF. Une grandeur absente garde la tolérance du code.
--   · lorani_projets.controle_familles_coupees text[] : les familles de constats qui ne tournent pas sur ce projet
--     (incoherence, plu, cctp_dpgf, metre_dpgf, re2020, accessibilite, securite_incendie).
--   · public.lorani_regler_controles(projet, tolerances, familles_coupees) : réservé au gérant, à l'admin et au chef de
--     projet ; tolérances validées (grandeur connue, 0 à 10 fois la tolérance du code, plafonnée à 50) ; journal
--     lorani.controles_regles. Les réglages ne se changent pas par un UPDATE direct.
--   · private.lorani_tolerance(réglages, grandeur) : la tolérance appliquée.
--   · private.lorani_controler (corps de b5_16b) : tolérances du projet pour les incohérences, la marge des règles du
--     PLU et l'écart métré/DPGF ; une famille coupée ne produit plus de constat, et ses constats encore ouverts sont
--     écartés avec le réglage pour motif (ni « corrigés » ni « corrigés à l'indice suivant »).
--   · private.lorani_changements_indice (corps de b5_28) : la tolérance du projet décide de ce qui a « changé ».
-- Les réglages valent au prochain passage : un contrôle déjà passé ne bouge pas tant qu'on ne le relance pas.
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS controle_tolerances jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS controle_familles_coupees text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION private.lorani_tolerance(p_reglages jsonb, p_grandeur text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(case when jsonb_typeof(p_reglages -> p_grandeur) = 'number' then (p_reglages ->> p_grandeur)::numeric end,
                  (private.lorani_grandeur(p_grandeur) ->> 'tolerance')::numeric, 0)
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_tolerance(jsonb, text) FROM PUBLIC;

-- Les réglages se posent par la porte : un membre ne les change pas par un UPDATE direct.
CREATE OR REPLACE FUNCTION private.lorani_projets_garder_reglages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (new.controle_tolerances, new.controle_familles_coupees) is distinct from (old.controle_tolerances, old.controle_familles_coupees)
     and (select auth.uid()) is not null and current_setting('lorani.reglages_en_cours', true) is distinct from 'oui' then
    raise exception 'Les contrôles se règlent par « Régler les contrôles ».' using errcode = '42501';
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_projets_garder_reglages() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lorani_regler_controles(p_projet uuid, p_tolerances jsonb, p_familles_coupees text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_moi uuid := (select auth.uid());
  v_tol jsonb := coalesce(p_tolerances, '{}'::jsonb);
  v_coupees text[];
  k text;
  v jsonb;
  v_defaut numeric;
begin
  select * into pr from public.lorani_projets where id = p_projet for update;
  if not found or not private.lorani_ecrit_projet(pr.client_id, pr.entite_id, pr.id) then
    raise exception 'Projet introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  if v_moi is not null
     and not exists (select 1 from public.comptes m where m.user_id = v_moi and m.client_id = pr.client_id and m.role in ('gerant', 'admin'))
     and not exists (select 1 from public.lorani_membres_projet mp where mp.client_id = pr.client_id and mp.projet_id = pr.id
                     and mp.user_id = v_moi and mp.role_projet = 'chef_projet') then
    raise exception 'Seuls le gérant, un admin ou le chef de projet règlent les contrôles.' using errcode = '42501';
  end if;
  if jsonb_typeof(v_tol) <> 'object' then
    raise exception 'Les tolérances sont une liste « grandeur : écart ».' using errcode = '22023';
  end if;
  for k, v in select * from jsonb_each(v_tol) loop
    if jsonb_typeof(v) <> 'number' then
      raise exception 'Tolérance « % » : un nombre est attendu.', k using errcode = '22023';
    end if;
    if k = 'metre_dpgf_pct' then
      if (v #>> '{}')::numeric not between 1 and 50 then
        raise exception 'L''écart toléré entre métré et DPGF va de 1 à 50 %%.' using errcode = '22023';
      end if;
      continue;
    end if;
    v_defaut := (private.lorani_grandeur(k) ->> 'tolerance')::numeric;
    if v_defaut is null then
      raise exception 'Grandeur inconnue : « % ».', k using errcode = '22023';
    end if;
    if (v #>> '{}')::numeric < 0 or (v #>> '{}')::numeric > least(50, greatest(10 * v_defaut, 1)) then
      raise exception 'Tolérance de « % » hors des bornes (0 à %).', private.lorani_grandeur(k) ->> 'libelle', least(50, greatest(10 * v_defaut, 1)) using errcode = '22023';
    end if;
  end loop;
  select coalesce(array_agg(distinct btrim(f) order by btrim(f)), '{}') into v_coupees from unnest(coalesce(p_familles_coupees, '{}')) f where btrim(f) <> '';
  if exists (select 1 from unnest(v_coupees) f where not private.lorani_nature_constat_valide(f)) then
    raise exception 'Famille de contrôle inconnue.' using errcode = '22023';
  end if;
  if cardinality(v_coupees) >= 7 then
    raise exception 'Gardez au moins une famille de contrôle.' using errcode = '22023';
  end if;
  if (pr.controle_tolerances, pr.controle_familles_coupees) is not distinct from (v_tol, v_coupees) then
    return jsonb_build_object('projet', pr.id, 'deja', true);
  end if;
  perform set_config('lorani.reglages_en_cours', 'oui', true);
  update public.lorani_projets set controle_tolerances = v_tol, controle_familles_coupees = v_coupees where id = pr.id;
  perform set_config('lorani.reglages_en_cours', '', true);
  perform private.journaliser_module(pr.client_id, 'lorani', 'lorani.controles_regles', 'lorani_projet', pr.id::text,
    jsonb_build_object('avant', jsonb_build_object('tolerances', pr.controle_tolerances, 'familles_coupees', to_jsonb(pr.controle_familles_coupees)),
                       'apres', jsonb_build_object('tolerances', v_tol, 'familles_coupees', to_jsonb(v_coupees))), pr.entite_id);
  return jsonb_build_object('projet', pr.id, 'tolerances', v_tol, 'familles_coupees', to_jsonb(v_coupees));
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_regler_controles(uuid, jsonb, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_regler_controles(uuid, jsonb, text[]) TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_projets'::regclass and tgname = 'lorani_projets_garder_reglages') then
    create trigger lorani_projets_garder_reglages before update of controle_tolerances, controle_familles_coupees on public.lorani_projets
      for each row execute function private.lorani_projets_garder_reglages();
  end if;
end $$;

-- Le croisement (corps de b5_16b) : tolérances et familles du projet.
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
  v_coupees text[];
  v_metre numeric;
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found then
    raise exception 'Contrôle inconnu.' using errcode = 'P0002';
  end if;
  select * into pr from public.lorani_projets where id = c.projet_id;
  -- b5_31 : les réglages du projet (familles coupées, écart métré/DPGF)
  v_coupees := coalesce(pr.controle_familles_coupees, '{}');
  v_metre := coalesce((pr.controle_tolerances ->> 'metre_dpgf_pct')::numeric, 5) / 100;
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
      where q.quantite > 0 and abs(d.quantite - q.quantite) > v_metre * q.quantite
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
         and max(m.valeur) - min(m.valeur) > private.lorani_tolerance(pr.controle_tolerances, m.grandeur)
    ), depasse as (
      -- Chaque mesure hors d'une règle du PLU (une marge d'un dixième de la tolérance pour l'arrondi).
      select m.*, r.borne, r.seuil, r.article, r.reference as ref_regle, r.page as page_regle
      from m join r on r.grandeur = m.grandeur
      where m.role <> 'plu'
        and ((r.borne = 'max' and m.valeur > r.seuil + private.lorani_tolerance(pr.controle_tolerances, m.grandeur) / 10)
          or (r.borne = 'min' and m.valeur < r.seuil - private.lorani_tolerance(pr.controle_tolerances, m.grandeur) / 10))
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
    -- une famille coupée dans les réglages du projet ne produit pas de constat
    continue when e.nature = any (v_coupees);
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
  where k.controle_id = c.id and k.statut = 'ouvert' and not (k.signature = any (v_sigs)) and not (k.nature = any (v_coupees));
  -- Un constat ouvert d'une famille coupée depuis : écarté, avec le réglage pour motif (rien n'est corrigé pour autant).
  update public.lorani_constats k set statut = 'ecarte', motif = 'Famille de contrôle coupée dans les réglages du projet.'
  where k.controle_id = c.id and k.statut = 'ouvert' and k.nature = any (v_coupees);

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
       where o.controle_id = c.precedent_id and o.statut = 'ouvert' and not (o.signature = any (v_sigs)) and not (o.nature = any (v_coupees))
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

-- Les changements d'un indice à l'autre (corps de b5_28) : la tolérance du projet.
CREATE OR REPLACE FUNCTION private.lorani_changements_indice(p_controle uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with c as (select * from public.lorani_controles where id = p_controle),
  m as (
    -- les mesures des deux contrôles, rattachées à leur pièce par sa référence (ou son rôle)
    select cp.controle_id, coalesce(nullif(btrim(cp.reference), ''), cp.role) as reference, pv.piece_id,
           split_part(pv.champ, '.', 2) as grandeur, split_part(pv.champ, '.', 3) as objet,
           (pv.valeur #>> '{}')::numeric as valeur, pv.page, pv.texte, pv.boite
    from public.lorani_controle_pieces cp
    join public.pieces_valeurs pv on pv.piece_id = cp.piece_id and pv.chiffre is null
    where cp.controle_id in (select id from c union select precedent_id from c)
      and pv.champ ~ '^mesure\.[a-z0-9_]+\.[a-z0-9_]+$' and (pv.valeur #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and private.lorani_grandeur(split_part(pv.champ, '.', 2)) is not null
  ),
  n as (select distinct on (reference, grandeur, objet) * from m where controle_id = (select id from c) order by reference, grandeur, objet, page),
  a as (select distinct on (reference, grandeur, objet) * from m where controle_id = (select precedent_id from c) order by reference, grandeur, objet, page),
  d as (
    select coalesce(n.reference, a.reference) as reference, coalesce(n.grandeur, a.grandeur) as grandeur, coalesce(n.objet, a.objet) as objet,
           a.valeur as avant, n.valeur as apres, a.page as page_avant, n.page as page_apres, a.texte as texte_avant, n.texte as texte_apres,
           a.piece_id as piece_avant, n.piece_id as piece_apres, n.boite as boite_apres
    from n full join a on a.reference = n.reference and a.grandeur = n.grandeur and a.objet = n.objet
    -- une pièce absente de l'un des deux contrôles n'est pas un changement : seule une valeur d'une pièce présente des deux côtés compte
    where (n.reference is null and exists (select 1 from n x where x.reference = a.reference))
       or (a.reference is null and exists (select 1 from a x where x.reference = n.reference))
       or (n.valeur is not null and a.valeur is not null
           and abs(n.valeur - a.valeur) > private.lorani_tolerance((select pr.controle_tolerances from public.lorani_projets pr where pr.id = (select projet_id from c)), n.grandeur))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'reference', d.reference, 'grandeur', d.grandeur, 'objet', d.objet,
           'libelle', (private.lorani_grandeur(d.grandeur) ->> 'libelle') || private.lorani_objet_de(d.objet),
           'unite', private.lorani_grandeur(d.grandeur) ->> 'unite',
           'avant', d.avant, 'apres', d.apres, 'page_avant', d.page_avant, 'page_apres', d.page_apres,
           'texte_avant', d.texte_avant, 'texte_apres', d.texte_apres, 'piece_avant', d.piece_avant, 'piece_apres', d.piece_apres, 'boite_apres', d.boite_apres,
           'releve', exists (select 1 from public.lorani_constats k where k.controle_id = p_controle and k.statut <> 'corrige'
                             and k.grandeur = d.grandeur and coalesce(k.objet, '') = coalesce(d.objet, '')))
         order by d.reference, d.grandeur, d.objet), '[]'::jsonb)
  from d
  where (select precedent_id from c) is not null
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_changements_indice(uuid) FROM PUBLIC;


-- ═══ omega/modules/daliro/migrations/b6_33_devis_pdf.sql @ 6033be8
-- b6_33 — DALIRO : le devis en PDF, lu par le lecteur d'A1 puis importé (session B6, 15/10/2026), après b6_28
--
-- LA PROMESSE (/secteurs/btp) : « Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export. »
-- b6_28 importait le tableau collé d'Excel ou le CSV. Le lecteur v34 d'A1 (c51c6de) lit maintenant un devis PDF en
-- lignes : type daliro_devis, valeur « lignes » (numero, lot, designation, unite, quantite, prix_unitaire, montant),
-- plus montant_total_ht (CHAMPS-LECTURE.md, § Daliro). Le lecteur ne pose rien : l'écran relit, montre, importe.
--
-- CE QUI EST POSÉ.
--   · public.btp_deposer_devis(marche, nom, mime, octets, sha256, chemin) : le PDF, déjà mis dans omega-clients
--     sous <client>/btp_marche/<marche>/<nom>, devient une pièce du module daliro rattachée au marché (statut
--     « recue », type daliro_devis) ; le déclencheur du socle demande sa lecture. Le bureau (btp_exiger_bureau), sur
--     un marché À VÉRIFIER. Même fichier deux fois : refusé (empreinte). Journal daliro.devis_depose.
--   · public.btp_devis_lu(marche) : la dernière pièce daliro du marché, son statut, et ce que le lecteur en a lu
--     (lignes, montant_total_ht, numero, verifiee). L'écran l'interroge jusqu'à la lecture, montre l'aperçu, puis
--     appelle btp_importer_lignes (b6_28) au nom de l'utilisateur : chaque ligne passe par btp_ecrire_ligne.
--   · Lecture par cette porte (SECURITY DEFINER, bureau), pour ne pas dépendre de la politique des pièces sur un
--     objet « btp_marche ».
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_deposer_devis(p_marche uuid, p_nom_fichier text, p_mime text, p_octets bigint, p_sha256 text, p_chemin text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  v_nom text := nullif(btrim(p_nom_fichier), '');
  v_id uuid;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if m.statut <> 'a_verifier' then
    raise exception 'Le devis se lit sur un marché à vérifier : rouvrez-le d''abord.' using errcode = '23514';
  end if;
  if v_nom is null or char_length(v_nom) > 200 then
    raise exception 'Le nom du fichier est obligatoire (200 caractères au plus).' using errcode = '22023';
  end if;
  if p_mime is distinct from 'application/pdf' then
    raise exception 'Le devis se dépose en PDF (pour un tableur, collez-le ou exportez-le en CSV).' using errcode = '22023';
  end if;
  if p_octets is null or p_octets <= 0 or p_octets > 50 * 1024 * 1024 then
    raise exception 'Le fichier doit faire entre 1 octet et 50 Mo.' using errcode = '22023';
  end if;
  if p_sha256 !~* '^[0-9a-f]{64}$' then
    raise exception 'L''empreinte SHA-256 du fichier est attendue (64 caractères hexadécimaux).' using errcode = '22023';
  end if;
  if p_chemin is null or p_chemin !~ ('^' || m.client_id::text || '/btp_marche/' || m.id::text || '/[^/]{1,200}$') then
    raise exception 'Le fichier se dépose sous <organisation>/btp_marche/<marché>/<nom>.' using errcode = '22023';
  end if;
  begin
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256, chemin,
                               statut, type_piece)
    values (m.client_id, 'daliro', 'btp_marche', m.id::text, 'depot', (select auth.uid()), v_nom, p_mime, p_octets,
            lower(p_sha256), p_chemin, 'recue', 'daliro_devis')
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ce devis est déjà déposé sur ce marché (même empreinte).' using errcode = '23505';
  end;
  perform private.journaliser(m.client_id, 'daliro.devis_depose', 'btp_marches', m.id::text,
    jsonb_build_object('piece', v_id, 'nom', v_nom, 'octets', p_octets), m.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_devis_lu(p_marche uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_marches;
  p record;
begin
  select * into m from public.btp_marches where id = p_marche;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  select x.id, x.nom_fichier, x.statut, x.type_piece, x.recue_le into p
  from public.pieces x
  where x.client_id = m.client_id and x.module = 'daliro' and x.objet_type = 'btp_marche' and x.objet_id = m.id::text
  order by x.recue_le desc, x.id desc limit 1;
  if p.id is null then
    return jsonb_build_object('piece', null);
  end if;
  return jsonb_build_object(
    'piece', p.id, 'nom', p.nom_fichier, 'statut', p.statut, 'type_piece', p.type_piece, 'depose_le', p.recue_le,
    'lignes', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'lignes_verifiees', (select v.verifiee from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'lignes' order by v.cree_le desc limit 1),
    'montant_total_ht', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'montant_total_ht' order by v.cree_le desc limit 1),
    'numero', (select v.valeur from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'numero' order by v.cree_le desc limit 1));
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) from public, anon;
grant execute on function public.btp_deposer_devis(uuid, text, text, bigint, text, text) to authenticated, service_role;
revoke execute on function public.btp_devis_lu(uuid) from public, anon;
grant execute on function public.btp_devis_lu(uuid) to authenticated, service_role;
