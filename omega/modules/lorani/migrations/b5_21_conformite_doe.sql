-- LORANI, lot B5-21 — le contrôle du dossier étendu : RE2020, accessibilité, sécurité incendie des ERP ; surfaces du
-- Cerfa et fonds de plan des BET croisés comme les planches ; la complétude du DOE à la réception.
--
-- Pourquoi : n° 5 du carnet et les promesses de la page des architectes : « Accessibilité, ERP et RE2020 »,
-- « Surfaces recalculées contre le Cerfa », « RE2020 : attestation comparée aux plans », « Fonds de plan BET croisés »,
-- « Complétude du DOE à la réception ».
--
-- Ce qui est posé (sur le moteur de b5_16, par ses deux points d'extension) :
--   · private.lorani_grandeur : de nouvelles grandeurs mesurées (largeur de porte, de cheminement, de dégagement, pente
--     de rampe, ressaut, distance à un escalier, effectif, nombre de dégagements, surface habitable, surface de
--     référence RE2020).
--   · Surfaces du Cerfa (rôle cerfa) et fonds de plan BET (rôle bet) : leurs `mesure.<grandeur>.<objet>` entrent dans le
--     croisement « entre les pièces » de b5_16, sans rien de plus ; l'écart entre le Cerfa et les planches devient un
--     constat d'incohérence avec la page de chaque pièce.
--   · private.lorani_constats_supplementaires(controle) :
--       1. RE2020 (rôle re2020, attestation lue : `re2020.<indicateur>` et `re2020.<indicateur>_max`) : un indicateur
--          au-delà de son maximum = constat bloquant (Bbio, Cep, Cep,nr, Ic énergie, Ic construction, degrés-heures ;
--          arrêté du 4 août 2021) ; la surface de référence et la surface de plancher de l'attestation se croisent avec
--          les planches comme toute mesure ;
--       2. accessibilité, par les mesures des planches : ERP (arrêté du 20 avril 2017 : cheminement ≥ 1,40 m, art. 2 ;
--          porte ≥ 0,90 m, art. 10 ; pente de rampe ≤ 5 %, art. 2 ; ressaut ≤ 2 cm, art. 2) ; logement collectif
--          (arrêté du 24 décembre 2015 : cheminement ≥ 1,20 m, art. 2 ; porte ≥ 0,90 m, art. 11 ; rampe ≤ 5 % ;
--          ressaut ≤ 2 cm) ;
--       3. sécurité incendie des ERP (règlement du 25 juin 1980) : dégagement ≥ 0,90 m (une unité de passage, CO 36) ;
--          distance à un escalier ≤ 40 m (CO 43) ; nombre de dégagements selon l'effectif (CO 38 : 1 sous 20 personnes,
--          2 de 20 à 500, puis un de plus par 500).
--   · public.lorani_doe : les pièces attendues du dossier des ouvrages exécutés, par lot (plans conformes à
--     l'exécution, notices de fonctionnement et d'entretien, fiches techniques, procès-verbaux d'essais, garanties des
--     fabricants) et pour le projet (DIUO, C. trav., art. R4532-95) ; statut attendu | recu | sans_objet, pièce reçue.
--     public.lorani_preparer_doe(projet) pose la liste type ; à la réception (lorani_projets.reception_le), ce qui
--     manque lève une alerte par lot (CCAG-Travaux 2021, art. 40 : documents fournis après exécution).
--   · private.lorani_lectures_passage() (corps de b5_19) : les types lorani_cerfa, lorani_attestation_re2020,
--     lorani_plan_bet et lorani_notice vont au contrôle.
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

-- ——— le vocabulaire, élargi ———

CREATE OR REPLACE FUNCTION private.lorani_grandeur(p text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p
    when 'hauteur_faitage_m' then '{"libelle": "la hauteur au faîtage", "unite": "m", "tolerance": 0.05}'
    when 'hauteur_egout_m' then '{"libelle": "la hauteur à l''égout", "unite": "m", "tolerance": 0.05}'
    when 'hauteur_acrotere_m' then '{"libelle": "la hauteur à l''acrotère", "unite": "m", "tolerance": 0.05}'
    when 'recul_voie_m' then '{"libelle": "le recul sur voie", "unite": "m", "tolerance": 0.05}'
    when 'recul_limite_m' then '{"libelle": "le recul sur limite séparative", "unite": "m", "tolerance": 0.05}'
    when 'distance_batiments_m' then '{"libelle": "la distance entre bâtiments", "unite": "m", "tolerance": 0.05}'
    when 'emprise_sol_m2' then '{"libelle": "l''emprise au sol", "unite": "m²", "tolerance": 0.5}'
    when 'emprise_sol_pct' then '{"libelle": "l''emprise au sol", "unite": "%", "tolerance": 0.5}'
    when 'surface_plancher_m2' then '{"libelle": "la surface de plancher", "unite": "m²", "tolerance": 0.5}'
    when 'surface_taxable_m2' then '{"libelle": "la surface taxable", "unite": "m²", "tolerance": 0.5}'
    when 'surface_habitable_m2' then '{"libelle": "la surface habitable", "unite": "m²", "tolerance": 0.5}'
    when 'sref_m2' then '{"libelle": "la surface de référence (RE2020)", "unite": "m²", "tolerance": 0.5}'
    when 'espaces_verts_pct' then '{"libelle": "la part d''espaces verts", "unite": "%", "tolerance": 0.5}'
    when 'pleine_terre_pct' then '{"libelle": "la part de pleine terre", "unite": "%", "tolerance": 0.5}'
    when 'stationnement_nb' then '{"libelle": "le nombre de places de stationnement", "unite": "", "tolerance": 0}'
    when 'logements_nb' then '{"libelle": "le nombre de logements", "unite": "", "tolerance": 0}'
    when 'niveaux_nb' then '{"libelle": "le nombre de niveaux", "unite": "", "tolerance": 0}'
    when 'pente_toiture_pct' then '{"libelle": "la pente de toiture", "unite": "%", "tolerance": 0.5}'
    when 'longueur_m' then '{"libelle": "la longueur", "unite": "m", "tolerance": 0.05}'
    when 'largeur_m' then '{"libelle": "la largeur", "unite": "m", "tolerance": 0.05}'
    when 'cote_altimetrique_m' then '{"libelle": "la cote altimétrique", "unite": "m NGF", "tolerance": 0.05}'
    when 'largeur_porte_m' then '{"libelle": "la largeur de passage de la porte", "unite": "m", "tolerance": 0.01}'
    when 'largeur_cheminement_m' then '{"libelle": "la largeur du cheminement", "unite": "m", "tolerance": 0.01}'
    when 'largeur_degagement_m' then '{"libelle": "la largeur du dégagement", "unite": "m", "tolerance": 0.01}'
    when 'pente_rampe_pct' then '{"libelle": "la pente de la rampe", "unite": "%", "tolerance": 0.1}'
    when 'ressaut_m' then '{"libelle": "le ressaut", "unite": "m", "tolerance": 0.002}'
    when 'distance_escalier_m' then '{"libelle": "la distance à un escalier", "unite": "m", "tolerance": 0.05}'
    when 'effectif_nb' then '{"libelle": "l''effectif", "unite": "", "tolerance": 0}'
    when 'degagements_nb' then '{"libelle": "le nombre de dégagements", "unite": "", "tolerance": 0}'
  end::jsonb
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_grandeur(text) FROM PUBLIC;

-- Les règles chiffrées fixes, par nature de projet.
CREATE OR REPLACE FUNCTION private.lorani_regles_fixes(p_nature_projet text)
 RETURNS TABLE (nature text, grandeur text, borne text, seuil numeric, article text, gravite text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select r.nature, r.grandeur, r.borne, r.seuil::numeric, r.article, r.gravite from (values
    ('accessibilite', 'largeur_cheminement_m', 'min', 1.40, 'arrêté du 20 avril 2017, art. 2', 'majeur', 'erp'),
    ('accessibilite', 'largeur_porte_m', 'min', 0.90, 'arrêté du 20 avril 2017, art. 10', 'majeur', 'erp'),
    ('accessibilite', 'pente_rampe_pct', 'max', 5, 'arrêté du 20 avril 2017, art. 2', 'majeur', 'erp'),
    ('accessibilite', 'ressaut_m', 'max', 0.02, 'arrêté du 20 avril 2017, art. 2', 'mineur', 'erp'),
    ('securite_incendie', 'largeur_degagement_m', 'min', 0.90, 'règlement de sécurité ERP, art. CO 36', 'bloquant', 'erp'),
    ('securite_incendie', 'distance_escalier_m', 'max', 40, 'règlement de sécurité ERP, art. CO 43', 'bloquant', 'erp'),
    ('accessibilite', 'largeur_cheminement_m', 'min', 1.20, 'arrêté du 24 décembre 2015, art. 2', 'majeur', 'logement_collectif'),
    ('accessibilite', 'largeur_porte_m', 'min', 0.90, 'arrêté du 24 décembre 2015, art. 11', 'majeur', 'logement_collectif'),
    ('accessibilite', 'pente_rampe_pct', 'max', 5, 'arrêté du 24 décembre 2015, art. 2', 'majeur', 'logement_collectif'),
    ('accessibilite', 'ressaut_m', 'max', 0.02, 'arrêté du 24 décembre 2015, art. 2', 'mineur', 'logement_collectif')
  ) r(nature, grandeur, borne, seuil, article, gravite, pour)
  where r.pour = p_nature_projet
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_regles_fixes(text) FROM PUBLIC;

-- Les indicateurs RE2020.
CREATE OR REPLACE FUNCTION private.lorani_indicateur_re2020(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p
    when 'bbio' then 'Le besoin bioclimatique (Bbio)'
    when 'cep' then 'La consommation d''énergie primaire (Cep)'
    when 'cep_nr' then 'La consommation d''énergie primaire non renouvelable (Cep,nr)'
    when 'ic_energie' then 'L''impact carbone des consommations d''énergie (Ic énergie)'
    when 'ic_construction' then 'L''impact carbone des composants (Ic construction)'
    when 'dh' then 'L''inconfort d''été (degrés-heures)'
  end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_indicateur_re2020(text) FROM PUBLIC;

-- ——— les constats supplémentaires du contrôle ———

CREATE OR REPLACE FUNCTION private.lorani_constats_supplementaires(p_controle uuid)
 RETURNS TABLE (nature text, gravite text, grandeur text, objet text, signature text, titre text, correction text, article text, valeurs jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with c as (select k.*, p.nature as nature_projet from public.lorani_controles k join public.lorani_projets p on p.id = k.projet_id where k.id = p_controle),
  v as (
    select cp.role, coalesce(cp.reference, pc.nom_fichier) as reference, pv.piece_id, pv.champ, pv.valeur #>> '{}' as brut, pv.texte, pv.page, pv.boite
    from public.lorani_controle_pieces cp
    join c on c.id = cp.controle_id
    join public.pieces pc on pc.id = cp.piece_id
    join public.pieces_valeurs pv on pv.piece_id = cp.piece_id and pv.chiffre is null
  ),
  re as (
    select split_part(v.champ, '.', 2) as ind, v.brut::numeric as valeur, v.reference, v.page, v.boite, v.texte, v.piece_id,
           (select m.brut::numeric from v m where m.piece_id = v.piece_id and m.champ = v.champ || '_max' and m.brut ~ '^-?[0-9]+(\.[0-9]+)?$' limit 1) as maxi
    from v
    where v.role = 're2020' and v.champ ~ '^re2020\.[a-z_]+$' and v.champ !~ '_max$' and v.brut ~ '^-?[0-9]+(\.[0-9]+)?$'
      and private.lorani_indicateur_re2020(split_part(v.champ, '.', 2)) is not null
  ),
  m as (
    select v.*, split_part(v.champ, '.', 2) as grandeur, split_part(v.champ, '.', 3) as objet, v.brut::numeric as valeur
    from v
    where v.role in ('planche', 'bet', 'notice') and v.champ ~ '^mesure\.[a-z0-9_]+\.[a-z0-9_]+$' and v.brut ~ '^-?[0-9]+(\.[0-9]+)?$'
  ),
  fixes as (
    select distinct on (r.nature, m.grandeur, m.objet) r.nature, r.gravite, m.grandeur, m.objet, r.borne, r.seuil, r.article, m.valeur, m.reference, m.page, m.boite, m.texte, m.piece_id
    from m join c on true
    join lateral private.lorani_regles_fixes(c.nature_projet) r on r.grandeur = m.grandeur
    where (r.borne = 'min' and m.valeur < r.seuil - (private.lorani_grandeur(m.grandeur) ->> 'tolerance')::numeric / 10)
       or (r.borne = 'max' and m.valeur > r.seuil + (private.lorani_grandeur(m.grandeur) ->> 'tolerance')::numeric / 10)
    order by r.nature, m.grandeur, m.objet, case r.borne when 'max' then -m.valeur else m.valeur end
  ),
  degts as (
    -- CO 38 : le nombre de dégagements selon l'effectif
    select e.objet, e.valeur as effectif, d.valeur as nombre, d.reference, d.page, d.boite, d.texte, d.piece_id,
           case when e.valeur < 20 then 1 when e.valeur <= 500 then 2 else 2 + ceil((e.valeur - 500) / 500.0) end as requis
    from m e join m d on d.objet = e.objet and d.grandeur = 'degagements_nb'
    join c on c.nature_projet = 'erp'
    where e.grandeur = 'effectif_nb'
  )
  select 're2020', 'bloquant', 're2020_' || re.ind, 'projet', format('re2020|%s', re.ind),
         left(format('%s : %s sur %s, p. %s, au-delà de son maximum de %s.', private.lorani_indicateur_re2020(re.ind),
                     replace(trim_scale(re.valeur)::text, '.', ','), re.reference, coalesce(re.page::text, '?'), replace(trim_scale(re.maxi)::text, '.', ',')), 300),
         format('Reprendre la conception ou l''étude thermique : %s doit rester au plus à %s (RE2020).', lower(left(private.lorani_indicateur_re2020(re.ind), 1)) || substr(private.lorani_indicateur_re2020(re.ind), 2),
                replace(trim_scale(re.maxi)::text, '.', ',')),
         'RE2020, arrêté du 4 août 2021',
         jsonb_build_array(jsonb_build_object('piece', re.piece_id, 'reference', re.reference, 'page', re.page, 'boite', re.boite, 'valeur', re.valeur, 'texte', re.texte),
                           jsonb_build_object('reference', re.reference, 'page', re.page, 'valeur', re.maxi, 'borne', 'max', 'article', 'RE2020', 'regle', true))
  from re where re.maxi is not null and re.valeur > re.maxi
  union all
  select f.nature, f.gravite, f.grandeur, f.objet, format('%s|%s|%s|%s', f.nature, f.grandeur, f.objet, f.borne),
         left(format('%s%s (%s sur %s, p. %s) %s %s (%s %s, %s).',
                     initcap(left(private.lorani_grandeur(f.grandeur) ->> 'libelle', 1)) || substr(private.lorani_grandeur(f.grandeur) ->> 'libelle', 2),
                     private.lorani_objet_de(f.objet), private.lorani_mesure_texte(f.valeur, f.grandeur), f.reference, coalesce(f.page::text, '?'),
                     case f.borne when 'min' then 'est sous le minimum' else 'dépasse le maximum' end,
                     case f.nature when 'accessibilite' then 'd''accessibilité' else 'de sécurité incendie' end,
                     case f.borne when 'min' then 'au moins' else 'au plus' end, private.lorani_mesure_texte(f.seuil, f.grandeur), f.article), 300),
         format('Porter %s%s à %s %s (%s).', private.lorani_grandeur(f.grandeur) ->> 'libelle', private.lorani_objet_de(f.objet),
                case f.borne when 'min' then 'au moins' else 'au plus' end, private.lorani_mesure_texte(f.seuil, f.grandeur), f.article),
         f.article,
         jsonb_build_array(jsonb_build_object('piece', f.piece_id, 'reference', f.reference, 'page', f.page, 'boite', f.boite, 'valeur', f.valeur, 'texte', f.texte),
                           jsonb_build_object('reference', f.article, 'valeur', f.seuil, 'borne', f.borne, 'article', f.article, 'regle', true))
  from fixes f
  union all
  select 'securite_incendie', 'bloquant', 'degagements_nb', d.objet, format('securite_incendie|degagements_nb|%s', d.objet),
         left(format('%s%s : %s dégagement%s pour un effectif de %s (%s, p. %s) ; il en faut au moins %s.', 'Le nombre de dégagements', private.lorani_objet_de(d.objet),
                     trim_scale(d.nombre), case when d.nombre > 1 then 's' else '' end, trim_scale(d.effectif), d.reference, coalesce(d.page::text, '?'), d.requis), 300),
         format('Prévoir au moins %s dégagements%s (règlement de sécurité ERP, art. CO 38).', d.requis, private.lorani_objet_de(d.objet)),
         'règlement de sécurité ERP, art. CO 38',
         jsonb_build_array(jsonb_build_object('piece', d.piece_id, 'reference', d.reference, 'page', d.page, 'boite', d.boite, 'valeur', d.nombre, 'texte', d.texte),
                           jsonb_build_object('reference', 'art. CO 38', 'valeur', d.requis, 'borne', 'min', 'article', 'CO 38', 'regle', true))
  from degts d where d.nombre < d.requis
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_constats_supplementaires(uuid) FROM PUBLIC;

-- ——— le DOE ———

CREATE TABLE IF NOT EXISTS public.lorani_doe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid,
  nature text NOT NULL,
  intitule text NOT NULL,
  statut text NOT NULL DEFAULT 'attendu',
  piece_id uuid,
  recu_le date,
  motif text,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_doe_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_doe_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_doe_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_doe_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_doe_nature_check CHECK (nature = ANY (ARRAY['plans', 'notices', 'fiches', 'pv_essais', 'garanties', 'diuo', 'autre'])),
  CONSTRAINT lorani_doe_statut_check CHECK (statut = ANY (ARRAY['attendu', 'recu', 'sans_objet'])),
  CONSTRAINT lorani_doe_intitule_check CHECK (char_length(btrim(intitule)) BETWEEN 1 AND 200),
  CONSTRAINT lorani_doe_motif_check CHECK (statut <> 'sans_objet' OR char_length(btrim(coalesce(motif, ''))) >= 3)
);
CREATE UNIQUE INDEX IF NOT EXISTS lorani_doe_une_fois ON public.lorani_doe (projet_id, coalesce(lot_id, '00000000-0000-0000-0000-000000000000'::uuid), nature, intitule);
ALTER TABLE public.lorani_doe ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lorani_doe FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_doe TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_doe' and policyname = 'on voit le DOE des projets qu''on voit') then
    create policy "on voit le DOE des projets qu'on voit" on public.lorani_doe for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_doe' and policyname = 'qui ecrit sur le projet tient le DOE') then
    create policy "qui ecrit sur le projet tient le DOE" on public.lorani_doe for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_doe' and policyname = 'qui ecrit sur le projet met le DOE a jour') then
    create policy "qui ecrit sur le projet met le DOE a jour" on public.lorani_doe for update to authenticated
      using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
end $$;

CREATE OR REPLACE FUNCTION private.lorani_doe_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  new.intitule := btrim(regexp_replace(new.intitule, '\s+', ' ', 'g'));
  new.motif := nullif(btrim(new.motif), '');
  if new.piece_id is not null and not exists (select 1 from public.pieces p where p.id = new.piece_id and p.module = 'lorani' and p.objet_id = new.projet_id::text) then
    raise exception 'Cette pièce n''est pas une pièce de ce projet.' using errcode = '22023';
  end if;
  if new.piece_id is not null and new.statut = 'attendu' then
    new.statut := 'recu';
  end if;
  if new.statut = 'recu' and new.recu_le is null then
    new.recu_le := current_date;
  elsif new.statut <> 'recu' then
    new.recu_le := null;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_doe_preparer() FROM PUBLIC;

-- La liste type : cinq pièces par lot, et le DIUO du projet.
CREATE OR REPLACE FUNCTION public.lorani_preparer_doe(p_projet uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  n integer;
begin
  select * into pr from public.lorani_projets where id = p_projet;
  if not found or not private.lorani_ecrit_projet(pr.client_id, pr.entite_id, pr.id) then
    raise exception 'Projet introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  with attendus as (
    select l.id as lot_id, t.nature, t.intitule
    from public.lorani_lots l
    cross join (values ('plans', 'Plans conformes à l''exécution'), ('notices', 'Notices de fonctionnement et d''entretien'),
                       ('fiches', 'Fiches techniques des matériaux et équipements'), ('pv_essais', 'Procès-verbaux d''essais et d''autocontrôle'),
                       ('garanties', 'Garanties des fabricants')) t(nature, intitule)
    where l.projet_id = pr.id
    union all
    select null, 'diuo', 'Dossier d''intervention ultérieure sur l''ouvrage (DIUO)'
  ), poses as (
    insert into public.lorani_doe (client_id, entite_id, projet_id, lot_id, nature, intitule)
    select pr.client_id, pr.entite_id, pr.id, a.lot_id, a.nature, a.intitule from attendus a
    where not exists (select 1 from public.lorani_doe d where d.projet_id = pr.id and d.lot_id is not distinct from a.lot_id and d.nature = a.nature)
    returning 1
  ) select count(*) into n from poses;
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_preparer_doe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_preparer_doe(uuid) TO authenticated;

-- À la réception : ce qui manque au DOE, lot par lot.
CREATE OR REPLACE FUNCTION private.lorani_doe_a_la_reception()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n_lots integer := 0;
begin
  if new.reception_le is null or new.reception_le is not distinct from old.reception_le then
    return null;
  end if;
  for r in
    select d.lot_id, l.numero, count(*) as n, string_agg(d.intitule, ', ' order by d.nature) as manque,
           (select i.organisme from public.lorani_intervenants i where i.lot_id = d.lot_id and i.nature = 'entreprise' and i.actif limit 1) as entreprise
    from public.lorani_doe d left join public.lorani_lots l on l.id = d.lot_id
    where d.projet_id = new.id and d.statut = 'attendu'
    group by d.lot_id, l.numero
  loop
    n_lots := n_lots + 1;
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('« %s » : DOE incomplet à la réception — %s%s : %s pièce%s manquante%s (%s).', left(new.nom, 40),
                  coalesce('lot ' || r.numero, 'projet'), coalesce(' (' || r.entreprise || ')', ''), r.n,
                  case when r.n > 1 then 's' else '' end, case when r.n > 1 then 's' else '' end, r.manque), 200),
      jsonb_build_object('projet', new.id, 'lot', r.lot_id, 'manquantes', r.n, 'lien', private.lorani_lien_projet(new.id)),
      format('doe:%s:%s', new.id, coalesce(r.lot_id::text, 'projet')), true, private.lorani_chef_de_projet(new.client_id, new.id));
  end loop;
  perform private.journaliser_module(new.client_id, 'lorani', 'lorani.doe_a_la_reception', 'lorani_projet', new.id::text,
    jsonb_build_object('reception_le', new.reception_le, 'lots_incomplets', n_lots,
                       'attendus', (select count(*) from public.lorani_doe d where d.projet_id = new.id and d.statut = 'attendu'),
                       'recus', (select count(*) from public.lorani_doe d where d.projet_id = new.id and d.statut = 'recu')), new.entite_id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_doe_a_la_reception() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_doe'::regclass and tgname = 'lorani_doe_preparer') then
    create trigger lorani_doe_preparer before insert or update on public.lorani_doe for each row execute function private.lorani_doe_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_doe'::regclass and tgname = 'lorani_doe_tracer') then
    create trigger lorani_doe_tracer after insert or update on public.lorani_doe for each row execute function private.tracer('+lot_id', '+nature', '+statut', '+piece_id');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_projets'::regclass and tgname = 'lorani_projets_doe_reception') then
    create trigger lorani_projets_doe_reception after update of reception_le on public.lorani_projets
      for each row execute function private.lorani_doe_a_la_reception();
  end if;
end $$;

-- Le passage des lectures (corps de b5_19) : les nouvelles pièces du contrôle (Cerfa, attestation RE2020, fond de plan BET,
-- notice) vont au contrôle, pas à la lecture des courriers de la mairie.
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
