-- LORANI, lot B5-26 — l'analyse des offres : chaque offre alignée sur la DPGF, ligne par ligne (11/10/2026).
--
-- Pourquoi : la page des architectes promet, onglet « Analyse des offres » (Fonctionnement.tsx:478 à 536) :
-- « Chaque offre est alignée sur la DPGF. Lorani compare les offres reçues ligne par ligne, si bien que les postes non
-- chiffrés ressortent avant l'attribution » ; « Postes non chiffrés et réserves » ; « Écarts à l'estimation par ligne » ;
-- « Rapport d'analyse prêt à signer » ; et (Dossier.tsx:324) « Le poste 3.4 n'est chiffré que par une entreprise sur
-- trois ». Rien de cela n'existait (chiffrage, ligne 24 : D).
--
-- La lecture : un nouveau type de pièce, lorani_offre (contrat dans omega/modules/lorani/CHAMPS-LECTURE-LORANI.md,
-- chiffré par A1 : 1 j), avec entreprise, siren, lot, montant_total_ht, reserve.<n>, et par poste prix_unitaire.<ref>,
-- quantite.<ref>, montant.<ref>, unite.<ref>. La DPGF (lorani_dpgf, b5_16) donne les postes et leurs quantités ; quand
-- elle est chiffrée par la maîtrise d'œuvre (l'estimation), elle rend aussi prix_unitaire.<ref> et montant.<ref>.
--
-- Ce qui est posé :
--   · public.lorani_consultations : la consultation d'un lot (intitulé, DPGF de référence, estimation HT saisie à défaut
--     de DPGF chiffrée, seuil d'écart par ligne — 20 % par défaut —, date limite, statut ouverte | analysee | attribuee
--     | infructueuse, offre retenue, tableau comparatif calculé, analysée le).
--   · public.lorani_offres : une offre (entreprise, intervenant reconnu par SIREN ou par nom, pièce lue, montant annoncé,
--     montant recalculé, montant comparable, rang, écart à l'estimation, réserves, postes {ref: {pu, q, montant,
--     unite}}, constats [{code, gravite, ref, texte}], statut recue | analysee | retenue | ecartee, motif).
--   · private.lorani_analyser_consultation(consultation) : aligne chaque offre sur la DPGF et relève, par offre :
--       non_chiffre (poste de la DPGF absent ou à zéro, majeur) ; quantite (quantité modifiée de plus de 1 %, mineur) ;
--       arithmetique (PU × Q ≠ montant, au-delà de 1 € et de 0,5 %, majeur) ; total (total annoncé ≠ somme des postes,
--       au-delà de 1 €, majeur) ; hors_dpgf (poste ajouté, mineur) ; ecart_estimation (écart au montant estimé de la
--       ligne au-delà du seuil, mineur) ; reserve (chaque réserve écrite, majeur).
--     Puis, pour la consultation : les postes chiffrés par aucune entreprise ou par une seule ; le montant comparable
--     de chaque offre (somme des postes, les postes non chiffrés comptés au prix médian des autres offres, sinon à
--     l'estimation) et le classement ; l'écart de chacune à l'estimation. Alerte au chef de projet ; journal
--     lorani.offres_analysees.
--   · private.lorani_poser_offre_lue(piece) : une offre lue rejoint la consultation ouverte de son lot (ou, si l'offre ne
--     dit pas son lot, la seule consultation ouverte du projet), puis la consultation est réanalysée ; sans consultation : alerte « à ranger »,
--     et l'ouverture d'une consultation (trigger) reprend les offres lues qui attendaient.
--   · public.lorani_analyser_offres(consultation) et public.lorani_attribuer_offre(offre, motif) : portes de l'écran.
--     Attribuer retient l'offre, clôt la consultation et crée le marché du lot (lorani_marches, b5_13) s'il n'existe
--     pas : les situations de travaux pourront s'y rapporter. Journal lorani.offre_retenue.
--   · private.lorani_lectures_passage() (corps de b5_23) prend le type lorani_offre, et réanalyse les consultations
--     quand leur DPGF est lue.
-- Fonctions nouvelles de private fermées au public. Idempotent ; rien n'est retiré.

-- ——— les tables ———

CREATE TABLE IF NOT EXISTS public.lorani_consultations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  intitule text NOT NULL,
  dpgf_piece_id uuid,
  estimation_ht numeric(14,2),
  seuil_ecart_pct numeric(5,2) NOT NULL DEFAULT 20,
  date_limite date,
  statut text NOT NULL DEFAULT 'ouverte',
  offre_retenue uuid,
  tableau jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysee_le timestamptz,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_consultations_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_consultations_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_consultations_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_consultations_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_consultations_dpgf_fkey FOREIGN KEY (dpgf_piece_id) REFERENCES public.pieces (id),
  CONSTRAINT lorani_consultations_intitule_check CHECK (char_length(btrim(intitule)) BETWEEN 1 AND 160),
  CONSTRAINT lorani_consultations_statut_check CHECK (statut = ANY (ARRAY['ouverte', 'analysee', 'attribuee', 'infructueuse'])),
  CONSTRAINT lorani_consultations_estimation_check CHECK (estimation_ht IS NULL OR (estimation_ht > 0 AND estimation_ht <= 1000000000)),
  CONSTRAINT lorani_consultations_seuil_check CHECK (seuil_ecart_pct > 0 AND seuil_ecart_pct <= 100),
  CONSTRAINT lorani_consultations_une_fois UNIQUE (lot_id, intitule)
);
CREATE INDEX IF NOT EXISTS lorani_consultations_projet_idx ON public.lorani_consultations (projet_id, statut);

CREATE TABLE IF NOT EXISTS public.lorani_offres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  consultation_id uuid NOT NULL,
  piece_id uuid,
  intervenant_id uuid,
  entreprise text NOT NULL,
  siren text,
  montant_ht numeric(14,2),
  montant_calcule_ht numeric(14,2),
  montant_comparable_ht numeric(14,2),
  rang smallint,
  ecart_estimation_pct numeric(7,2),
  reserves jsonb NOT NULL DEFAULT '[]'::jsonb,
  postes jsonb NOT NULL DEFAULT '{}'::jsonb,
  constats jsonb NOT NULL DEFAULT '[]'::jsonb,
  statut text NOT NULL DEFAULT 'recue',
  motif text,
  recue_le date NOT NULL DEFAULT current_date,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_offres_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_offres_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_offres_piece_key UNIQUE (piece_id),
  CONSTRAINT lorani_offres_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_offres_consultation_fkey FOREIGN KEY (client_id, consultation_id) REFERENCES public.lorani_consultations (client_id, id),
  CONSTRAINT lorani_offres_intervenant_fkey FOREIGN KEY (client_id, intervenant_id) REFERENCES public.lorani_intervenants (client_id, id),
  CONSTRAINT lorani_offres_entreprise_check CHECK (char_length(btrim(entreprise)) BETWEEN 1 AND 200),
  CONSTRAINT lorani_offres_siren_check CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  CONSTRAINT lorani_offres_montant_check CHECK (montant_ht IS NULL OR (montant_ht >= 0 AND montant_ht <= 1000000000)),
  CONSTRAINT lorani_offres_statut_check CHECK (statut = ANY (ARRAY['recue', 'analysee', 'retenue', 'ecartee'])),
  CONSTRAINT lorani_offres_motif_check CHECK (motif IS NULL OR char_length(motif) <= 500),
  CONSTRAINT lorani_offres_ecartee_check CHECK (statut <> 'ecartee' OR char_length(btrim(coalesce(motif, ''))) >= 3)
);
CREATE INDEX IF NOT EXISTS lorani_offres_consultation_idx ON public.lorani_offres (consultation_id);

ALTER TABLE public.lorani_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_offres ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lorani_consultations, public.lorani_offres FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_consultations, public.lorani_offres TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_consultations', 'lorani_offres'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit les offres des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit les offres des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet consulte') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet consulte', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet met a jour la consultation') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet met a jour la consultation', t);
    end if;
  end loop;
end $$;

-- ——— la tenue des lignes ———

CREATE OR REPLACE FUNCTION private.lorani_consultation_tenir()
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
  if not exists (select 1 from public.lorani_lots l where l.id = new.lot_id and l.projet_id = new.projet_id) then
    raise exception 'Ce lot n''est pas un lot du projet.' using errcode = '22023';
  end if;
  if new.dpgf_piece_id is not null and not exists (select 1 from public.pieces p where p.id = new.dpgf_piece_id and p.module = 'lorani'
                                                    and p.objet_type = 'lorani_projet' and p.objet_id = new.projet_id::text) then
    raise exception 'Cette DPGF n''est pas une pièce du projet.' using errcode = '22023';
  end if;
  if new.offre_retenue is not null and not exists (select 1 from public.lorani_offres o where o.id = new.offre_retenue and o.consultation_id = new.id) then
    raise exception 'Cette offre n''appartient pas à la consultation.' using errcode = '22023';
  end if;
  new.maj_le := now();
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_consultation_tenir() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_offre_tenir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_consultations;
begin
  select * into c from public.lorani_consultations where id = new.consultation_id;
  if not found then
    raise exception 'Consultation introuvable.' using errcode = '22023';
  end if;
  new.client_id := c.client_id;
  new.entite_id := c.entite_id;
  new.projet_id := c.projet_id;
  new.entreprise := btrim(regexp_replace(new.entreprise, '\s+', ' ', 'g'));
  new.siren := nullif(regexp_replace(coalesce(new.siren, ''), '\s', '', 'g'), '');
  new.motif := nullif(btrim(new.motif), '');
  if new.intervenant_id is not null and not exists (select 1 from public.lorani_intervenants i where i.id = new.intervenant_id and i.projet_id = new.projet_id) then
    raise exception 'Cette entreprise n''est pas un intervenant du projet.' using errcode = '22023';
  end if;
  new.maj_le := now();
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_offre_tenir() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_consultations'::regclass and tgname = 'lorani_consultations_tenir') then
    create trigger lorani_consultations_tenir before insert or update on public.lorani_consultations
      for each row execute function private.lorani_consultation_tenir();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_offres'::regclass and tgname = 'lorani_offres_tenir') then
    create trigger lorani_offres_tenir before insert or update on public.lorani_offres
      for each row execute function private.lorani_offre_tenir();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_consultations'::regclass and tgname = 'lorani_consultations_tracer') then
    create trigger lorani_consultations_tracer after insert or update on public.lorani_consultations
      for each row execute function private.tracer('+statut', '+offre_retenue', '+dpgf_piece_id', '+estimation_ht');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_offres'::regclass and tgname = 'lorani_offres_tracer') then
    create trigger lorani_offres_tracer after insert or update on public.lorani_offres
      for each row execute function private.tracer('+statut', '+motif', '+montant_ht');
  end if;
end $$;

-- ——— les nombres et les lots lus ———

CREATE OR REPLACE FUNCTION private.lorani_nombre_lu(p text)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p ~ '^-?[0-9]+(\.[0-9]+)?$' then p::numeric else private.lorani_montant_lu(p) end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_nombre_lu(text) FROM PUBLIC;

-- « Lot 03 », « lot n° 3 », « 03 » → « 3 » ; « 08.2 » → « 8.2 »
CREATE OR REPLACE FUNCTION private.lorani_lot_comparable(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(regexp_replace(regexp_replace(lower(btrim(coalesce(p, ''))), '^lot\s*(n\s*[°o]?\s*)?', ''), '^0+(?=[0-9])', ''), '')
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_lot_comparable(text) FROM PUBLIC;

-- ——— l'analyse ———

CREATE OR REPLACE FUNCTION private.lorani_analyser_consultation(p_consultation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_consultations;
  pr public.lorani_projets;
  lo public.lorani_lots;
  o public.lorani_offres;
  v_dpgf uuid;
  v_postes jsonb := '{}'::jsonb;      -- {ref: {libelle, quantite, unite, pu, montant, page}}
  v_ref text;
  d jsonb;
  x jsonb;
  v_constats jsonb;
  v_somme numeric;
  v_comparable numeric;
  v_estimation numeric;
  v_med numeric;
  v_q numeric; v_pu numeric; v_m numeric;
  v_n integer;
  v_offres integer;
  v_aucune jsonb := '[]'::jsonb;
  v_une jsonb := '[]'::jsonb;
  v_lignes jsonb := '[]'::jsonb;
  v_classement jsonb;
  v_non_chiffres integer := 0;
  v_premier public.lorani_offres;
begin
  select * into c from public.lorani_consultations where id = p_consultation for update;
  if not found then
    return jsonb_build_object('ignore', 'consultation inconnue');
  end if;
  select * into pr from public.lorani_projets where id = c.projet_id;
  select * into lo from public.lorani_lots where id = c.lot_id;

  -- la DPGF de référence : celle de la consultation, sinon la dernière DPGF lue du même lot
  v_dpgf := c.dpgf_piece_id;
  if v_dpgf is null then
    select p.id into v_dpgf from public.pieces p
    where p.module = 'lorani' and p.objet_type = 'lorani_projet' and p.objet_id = c.projet_id::text and p.type_piece = 'lorani_dpgf'
      and exists (select 1 from public.pieces_valeurs pv where pv.piece_id = p.id and pv.champ = 'lot' and pv.chiffre is null
                  and private.lorani_lot_comparable(pv.valeur #>> '{}') = private.lorani_lot_comparable(lo.numero))
    order by p.depose_le desc nulls last limit 1;
  end if;
  if v_dpgf is not null then
    for x in
      select jsonb_build_object('champ', pv.champ, 'brut', pv.valeur #>> '{}', 'texte', pv.texte, 'page', pv.page)
      from public.pieces_valeurs pv
      where pv.piece_id = v_dpgf and pv.chiffre is null and pv.champ ~ '^(poste|unite|prix_unitaire|montant)\.[a-z0-9_]+$'
    loop
      v_ref := split_part(x ->> 'champ', '.', 2);
      d := coalesce(v_postes -> v_ref, '{}'::jsonb);
      case split_part(x ->> 'champ', '.', 1)
        when 'poste' then d := d || jsonb_build_object('quantite', private.lorani_nombre_lu(x ->> 'brut'), 'libelle', left(coalesce(x ->> 'texte', ''), 160), 'page', x -> 'page');
        when 'unite' then d := d || jsonb_build_object('unite', left(x ->> 'brut', 12));
        when 'prix_unitaire' then d := d || jsonb_build_object('pu', private.lorani_nombre_lu(x ->> 'brut'));
        when 'montant' then d := d || jsonb_build_object('montant', private.lorani_nombre_lu(x ->> 'brut'));
      end case;
      v_postes := v_postes || jsonb_build_object(v_ref, d);
    end loop;
    -- un poste n'existe que s'il est décrit par sa ligne « poste »
    v_postes := coalesce((select jsonb_object_agg(k, v) from jsonb_each(v_postes) e(k, v) where v ? 'quantite'), '{}'::jsonb);
    -- l'estimation de la ligne : le montant écrit, sinon PU × Q
    v_postes := coalesce((select jsonb_object_agg(k, v || jsonb_build_object('estimation',
                  coalesce((v ->> 'montant')::numeric, round((v ->> 'pu')::numeric * (v ->> 'quantite')::numeric, 2))))
                from jsonb_each(v_postes) e(k, v)), '{}'::jsonb);
  end if;
  v_estimation := coalesce(c.estimation_ht, (select sum((v ->> 'estimation')::numeric) from jsonb_each(v_postes) e(k, v) having count(v ->> 'estimation') > 0));
  select count(*) into v_offres from public.lorani_offres where consultation_id = c.id;

  -- 1. chaque offre, ligne par ligne
  for o in select * from public.lorani_offres where consultation_id = c.id order by cree_le, id loop
    v_constats := '[]'::jsonb;
    for v_ref, d in select k, v from jsonb_each(v_postes) e(k, v) order by k loop
      x := o.postes -> v_ref;
      v_m := coalesce((x ->> 'montant')::numeric, round((x ->> 'pu')::numeric * coalesce((x ->> 'q')::numeric, (d ->> 'quantite')::numeric), 2));
      if x is null or coalesce(v_m, 0) = 0 then
        v_constats := v_constats || jsonb_build_object('code', 'non_chiffre', 'gravite', 'majeur', 'ref', v_ref,
          'texte', format('Poste %s non chiffré%s.', replace(v_ref, '_', '.'), coalesce(' (' || nullif(d ->> 'libelle', '') || ')', '')));
        continue;
      end if;
      v_q := (x ->> 'q')::numeric;
      v_pu := (x ->> 'pu')::numeric;
      if v_q is not null and (d ->> 'quantite')::numeric > 0 and abs(v_q - (d ->> 'quantite')::numeric) > 0.01 * (d ->> 'quantite')::numeric then
        v_constats := v_constats || jsonb_build_object('code', 'quantite', 'gravite', 'mineur', 'ref', v_ref,
          'texte', format('Poste %s : quantité %s au lieu de %s à la DPGF.', replace(v_ref, '_', '.'), private.lorani_nombre_fr(v_q), private.lorani_nombre_fr((d ->> 'quantite')::numeric)));
      end if;
      if v_pu is not null and x ->> 'montant' is not null
         and abs(v_pu * coalesce(v_q, (d ->> 'quantite')::numeric) - (x ->> 'montant')::numeric) > greatest(1, 0.005 * (x ->> 'montant')::numeric) then
        v_constats := v_constats || jsonb_build_object('code', 'arithmetique', 'gravite', 'majeur', 'ref', v_ref,
          'texte', format('Poste %s : %s × %s = %s €, l''offre écrit %s €.', replace(v_ref, '_', '.'), private.lorani_nombre_fr(v_pu),
                          private.lorani_nombre_fr(coalesce(v_q, (d ->> 'quantite')::numeric)), private.lorani_nombre_fr(round(v_pu * coalesce(v_q, (d ->> 'quantite')::numeric), 2)),
                          private.lorani_nombre_fr((x ->> 'montant')::numeric)));
      end if;
      if (d ->> 'estimation')::numeric > 0 and abs(v_m - (d ->> 'estimation')::numeric) > c.seuil_ecart_pct / 100 * (d ->> 'estimation')::numeric then
        v_constats := v_constats || jsonb_build_object('code', 'ecart_estimation', 'gravite', 'mineur', 'ref', v_ref,
          'texte', format('Poste %s : écart de %s %% à l''estimation (%s € contre %s €).', replace(v_ref, '_', '.'),
                          private.lorani_nombre_fr(round(100 * (v_m - (d ->> 'estimation')::numeric) / (d ->> 'estimation')::numeric)),
                          private.lorani_nombre_fr(v_m), private.lorani_nombre_fr((d ->> 'estimation')::numeric)));
      end if;
    end loop;
    -- les postes ajoutés par l'entreprise
    if v_postes <> '{}'::jsonb then
      for v_ref in select k from jsonb_object_keys(o.postes) k where not (v_postes ? k) order by k loop
        v_constats := v_constats || jsonb_build_object('code', 'hors_dpgf', 'gravite', 'mineur', 'ref', v_ref,
          'texte', format('Poste %s ajouté par l''entreprise, absent de la DPGF.', replace(v_ref, '_', '.')));
      end loop;
    end if;
    -- le total
    select sum(coalesce((v ->> 'montant')::numeric, round((v ->> 'pu')::numeric * coalesce((v ->> 'q')::numeric, (v_postes -> k ->> 'quantite')::numeric), 2)))
      into v_somme from jsonb_each(o.postes) e(k, v);
    if o.montant_ht is not null and v_somme is not null and abs(o.montant_ht - v_somme) > 1 then
      v_constats := v_constats || jsonb_build_object('code', 'total', 'gravite', 'majeur', 'ref', null,
        'texte', format('Total annoncé %s € HT, somme des postes %s € HT.', private.lorani_nombre_fr(o.montant_ht), private.lorani_nombre_fr(v_somme)));
    end if;
    -- les réserves
    select v_constats || coalesce(jsonb_agg(jsonb_build_object('code', 'reserve', 'gravite', 'majeur', 'ref', null, 'texte', 'Réserve : ' || (r #>> '{}'))), '[]'::jsonb)
      into v_constats from jsonb_array_elements(o.reserves) r;
    update public.lorani_offres set constats = v_constats, montant_calcule_ht = v_somme,
           statut = case when statut = 'recue' then 'analysee' else statut end
    where id = o.id;
  end loop;

  -- 2. la consultation : les postes que personne, ou une seule entreprise, ne chiffre ; le tableau
  for v_ref, d in select k, v from jsonb_each(v_postes) e(k, v) order by k loop
    select count(*) filter (where coalesce((ob.postes -> v_ref ->> 'montant')::numeric, (ob.postes -> v_ref ->> 'pu')::numeric * (d ->> 'quantite')::numeric, 0) > 0),
           percentile_cont(0.5) within group (order by coalesce((ob.postes -> v_ref ->> 'montant')::numeric, round((ob.postes -> v_ref ->> 'pu')::numeric * (d ->> 'quantite')::numeric, 2)))
      into v_n, v_med
    from public.lorani_offres ob where ob.consultation_id = c.id;
    if v_offres > 0 and v_n = 0 then
      v_aucune := v_aucune || to_jsonb(v_ref);
    elsif v_offres > 1 and v_n = 1 then
      v_une := v_une || to_jsonb(v_ref);
    end if;
    v_lignes := v_lignes || jsonb_build_object('ref', v_ref, 'libelle', d ->> 'libelle', 'quantite', d -> 'quantite', 'unite', d -> 'unite',
      'estimation', d -> 'estimation', 'mediane', round(v_med, 2), 'chiffree_par', v_n,
      'offres', coalesce((select jsonb_object_agg(ob.id, jsonb_build_object('pu', ob.postes -> v_ref -> 'pu', 'q', ob.postes -> v_ref -> 'q', 'montant',
                            coalesce((ob.postes -> v_ref ->> 'montant')::numeric, round((ob.postes -> v_ref ->> 'pu')::numeric * (d ->> 'quantite')::numeric, 2))))
                          from public.lorani_offres ob where ob.consultation_id = c.id and ob.postes ? v_ref), '{}'::jsonb));
  end loop;

  -- 3. le montant comparable (un poste non chiffré compte au prix médian des autres, sinon à l'estimation) et le rang
  for o in select * from public.lorani_offres where consultation_id = c.id loop
    v_comparable := coalesce(o.montant_calcule_ht, o.montant_ht, 0)
      + coalesce((select sum(coalesce((l ->> 'mediane')::numeric, (l ->> 'estimation')::numeric, 0)) from jsonb_array_elements(v_lignes) l
                  where not (l -> 'offres' ? o.id::text) or coalesce((l -> 'offres' -> o.id::text ->> 'montant')::numeric, 0) = 0), 0);
    update public.lorani_offres set montant_comparable_ht = round(v_comparable, 2),
           ecart_estimation_pct = case when v_estimation > 0 then round(100 * (v_comparable - v_estimation) / v_estimation, 2) end
    where id = o.id;
  end loop;
  update public.lorani_offres uo set rang = r.rang
  from (select x.id, rank() over (order by x.montant_comparable_ht nulls last)::smallint as rang from public.lorani_offres x where x.consultation_id = c.id and x.statut <> 'ecartee') r
  where uo.id = r.id;
  update public.lorani_offres set rang = null where consultation_id = c.id and statut = 'ecartee';

  select coalesce(jsonb_agg(jsonb_build_object('offre', o2.id, 'entreprise', o2.entreprise, 'montant_ht', o2.montant_ht, 'calcule_ht', o2.montant_calcule_ht,
                                               'comparable_ht', o2.montant_comparable_ht, 'rang', o2.rang, 'ecart_pct', o2.ecart_estimation_pct,
                                               'non_chiffres', (select count(*) from jsonb_array_elements(o2.constats) k where k ->> 'code' = 'non_chiffre'),
                                               'reserves', jsonb_array_length(o2.reserves), 'statut', o2.statut)
                            order by o2.rang nulls last, o2.entreprise), '[]'::jsonb)
    into v_classement from public.lorani_offres o2 where o2.consultation_id = c.id;
  select count(*) into v_non_chiffres from public.lorani_offres o3, jsonb_array_elements(o3.constats) k where o3.consultation_id = c.id and k ->> 'code' = 'non_chiffre';

  update public.lorani_consultations
     set tableau = jsonb_build_object('dpgf', v_dpgf, 'estimation_ht', v_estimation, 'postes', v_lignes, 'offres', v_classement,
                                      'aucune_offre', v_aucune, 'une_seule_offre', v_une, 'seuil_ecart_pct', c.seuil_ecart_pct),
         statut = case when statut = 'ouverte' and v_offres > 0 then 'analysee' else statut end,
         analysee_le = now()
   where id = c.id
  returning * into c;

  if v_offres > 0 then
    select * into v_premier from public.lorani_offres where consultation_id = c.id and rang = 1 order by entreprise limit 1;
    -- l'alerte de l'analyse précédente cède la place (le socle n'en garde qu'une ouverte par clé)
    update public.alertes set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'analyse refaite')
     where client_id = c.client_id and cle_regroupement = format('lorani:consultation:%s', c.id) and acquittee_le is null;
    perform private.lever_alerte_module(c.client_id, 'lorani', case when jsonb_array_length(v_aucune) > 0 then 'attention' else 'info' end,
      left(format('« %s », lot %s : %s offre%s analysée%s%s%s ; la moins-disante comparable : %s, %s € HT%s.', left(pr.nom, 40), lo.numero,
                  v_offres, case when v_offres > 1 then 's' else '' end, case when v_offres > 1 then 's' else '' end,
                  case when v_non_chiffres > 0 then format(', %s poste%s non chiffré%s', v_non_chiffres, case when v_non_chiffres > 1 then 's' else '' end, case when v_non_chiffres > 1 then 's' else '' end) else '' end,
                  case when jsonb_array_length(v_aucune) > 0 then format(', %s chiffré%s par aucune entreprise', jsonb_array_length(v_aucune), case when jsonb_array_length(v_aucune) > 1 then 's' else '' end) else '' end,
                  left(v_premier.entreprise, 40), private.lorani_nombre_fr(v_premier.montant_comparable_ht),
                  case when v_premier.ecart_estimation_pct is not null then format(' (%s%s %% sur l''estimation)', case when v_premier.ecart_estimation_pct > 0 then '+' else '' end, private.lorani_nombre_fr(v_premier.ecart_estimation_pct)) else '' end), 200),
      jsonb_build_object('projet', c.projet_id, 'consultation', c.id, 'lien', private.lorani_lien_projet(c.projet_id)),
      format('consultation:%s', c.id), true, private.lorani_chef_de_projet(c.client_id, c.projet_id));
    perform private.journaliser_module(c.client_id, 'lorani', 'lorani.offres_analysees', 'lorani_projet', c.projet_id::text,
      jsonb_build_object('consultation', c.id, 'lot', lo.numero, 'offres', v_offres, 'aucune_offre', v_aucune, 'une_seule_offre', v_une,
                         'classement', v_classement), c.entite_id);
  end if;
  return jsonb_build_object('consultation', c.id, 'offres', v_offres, 'postes', jsonb_array_length(v_lignes), 'aucune_offre', v_aucune, 'une_seule_offre', v_une);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_analyser_consultation(uuid) FROM PUBLIC;

-- « 12400.5 » → « 12 400,5 » (espace fine insécable des milliers, virgule décimale), sans dépendre de la locale.
CREATE OR REPLACE FUNCTION private.lorani_nombre_fr(p numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p is null then '?' else
    (case when p < 0 then '-' else '' end)
    || regexp_replace(split_part(trim_scale(round(abs(p), 2))::text, '.', 1), '(\d)(?=(\d{3})+$)', '\1' || chr(8239), 'g')
    || coalesce(',' || nullif(split_part(trim_scale(round(abs(p), 2))::text, '.', 2), ''), '') end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_nombre_fr(numeric) FROM PUBLIC;

-- ——— une offre lue ———

CREATE OR REPLACE FUNCTION private.lorani_poser_offre_lue(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.pieces;
  pr public.lorani_projets;
  v jsonb := '{}'::jsonb;
  r record;
  v_postes jsonb := '{}'::jsonb;
  v_reserves jsonb := '[]'::jsonb;
  v_cons uuid;
  v_inter uuid;
  v_id uuid;
  v_ref text;
  v_cle text;
  v_entreprise text;
begin
  select * into p from public.pieces where id = p_piece;
  if not found or p.module <> 'lorani' or p.objet_type <> 'lorani_projet' then
    return jsonb_build_object('ignore', 'pièce hors des projets');
  end if;
  if exists (select 1 from public.lorani_offres where piece_id = p_piece) then
    return jsonb_build_object('deja', true);
  end if;
  select * into pr from public.lorani_projets where id = p.objet_id::uuid;
  for r in select pv.champ, pv.valeur #>> '{}' as brut from public.pieces_valeurs pv where pv.piece_id = p_piece and pv.chiffre is null order by pv.champ loop
    if r.champ ~ '^(prix_unitaire|quantite|montant|unite)\.[a-z0-9_]+$' then
      v_ref := split_part(r.champ, '.', 2);
      v_cle := case split_part(r.champ, '.', 1) when 'prix_unitaire' then 'pu' when 'quantite' then 'q' else split_part(r.champ, '.', 1) end;
      v_postes := jsonb_set(v_postes, array[v_ref], coalesce(v_postes -> v_ref, '{}'::jsonb)
                    || jsonb_build_object(v_cle, case when v_cle = 'unite' then to_jsonb(left(r.brut, 12)) else to_jsonb(private.lorani_nombre_lu(r.brut)) end));
    elsif r.champ ~ '^reserve\.[a-z0-9_]+$' and nullif(btrim(r.brut), '') is not null then
      v_reserves := v_reserves || to_jsonb(left(btrim(r.brut), 300));
    else
      v := v || jsonb_build_object(r.champ, r.brut);
    end if;
  end loop;
  v_entreprise := coalesce(nullif(btrim(v ->> 'entreprise'), ''), p.nom_fichier, 'Entreprise');

  -- la consultation ouverte du lot, sinon la seule consultation ouverte du projet
  select c.id into v_cons from public.lorani_consultations c join public.lorani_lots l on l.id = c.lot_id
  where c.projet_id = pr.id and c.statut in ('ouverte', 'analysee')
    and private.lorani_lot_comparable(l.numero) = private.lorani_lot_comparable(v ->> 'lot')
  order by c.cree_le desc limit 1;
  if v_cons is null and private.lorani_lot_comparable(v ->> 'lot') is null
     and (select count(*) from public.lorani_consultations c where c.projet_id = pr.id and c.statut in ('ouverte', 'analysee')) = 1 then
    select c.id into v_cons from public.lorani_consultations c where c.projet_id = pr.id and c.statut in ('ouverte', 'analysee');
  end if;
  if v_cons is null then
    perform private.lever_alerte_module(pr.client_id, 'lorani', 'attention',
      left(format('« %s » : une offre de %s%s est lue, mais aucune consultation ouverte ne l''attend : ouvrez la consultation du lot.',
                  left(pr.nom, 50), left(v_entreprise, 60), coalesce(' (lot ' || private.lorani_lot_comparable(v ->> 'lot') || ')', '')), 200),
      jsonb_build_object('projet', pr.id, 'piece', p_piece, 'lien', private.lorani_lien_projet(pr.id)),
      format('offre:%s:a_ranger', p_piece), true, private.lorani_chef_de_projet(pr.client_id, pr.id));
    return jsonb_build_object('a_ranger', true, 'piece', p_piece);
  end if;

  -- l'entreprise : par SIREN, sinon par le nom
  select i.id into v_inter from public.lorani_intervenants i
  where i.projet_id = pr.id and i.actif and i.nature = 'entreprise'
    and ((v ->> 'siren' is not null and i.siren = regexp_replace(v ->> 'siren', '\s', '', 'g'))
         or private.lorani_nom_comparable(i.organisme) = private.lorani_nom_comparable(v_entreprise))
  order by (i.siren = regexp_replace(coalesce(v ->> 'siren', ''), '\s', '', 'g')) desc nulls last
  limit 1;

  insert into public.lorani_offres (client_id, entite_id, projet_id, consultation_id, piece_id, intervenant_id, entreprise, siren, montant_ht, reserves, postes, cree_par)
  values (pr.client_id, pr.entite_id, pr.id, v_cons, p_piece, v_inter, left(v_entreprise, 200),
          case when regexp_replace(coalesce(v ->> 'siren', ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(v ->> 'siren', '\s', '', 'g') end,
          private.lorani_nombre_lu(v ->> 'montant_total_ht'), v_reserves, v_postes, p.depose_par)
  returning id into v_id;
  update public.alertes set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'offre rangée')
   where client_id = pr.client_id and cle_regroupement = format('lorani:offre:%s:a_ranger', p_piece) and acquittee_le is null;
  perform private.lorani_analyser_consultation(v_cons);
  return jsonb_build_object('offre', v_id, 'consultation', v_cons, 'entreprise', v_inter);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_poser_offre_lue(uuid) FROM PUBLIC;

-- Une consultation ouverte reprend les offres déjà lues du projet qui attendaient d'être rangées.
CREATE OR REPLACE FUNCTION private.lorani_consultation_ouverte()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
begin
  for r in
    select p.id from public.pieces p
    where p.module = 'lorani' and p.objet_type = 'lorani_projet' and p.objet_id = new.projet_id::text and p.type_piece = 'lorani_offre'
      and p.statut in ('lue', 'a_verifier', 'a_classer')
      and not exists (select 1 from public.lorani_offres o where o.piece_id = p.id)
    order by p.depose_le
  loop
    perform private.lorani_poser_offre_lue(r.id);
  end loop;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_consultation_ouverte() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_consultations'::regclass and tgname = 'lorani_consultations_ouverte') then
    create trigger lorani_consultations_ouverte after insert on public.lorani_consultations
      for each row execute function private.lorani_consultation_ouverte();
  end if;
end $$;

-- Une DPGF lue : les consultations qui s'y rapportent sont réanalysées.
CREATE OR REPLACE FUNCTION private.lorani_offres_dpgf_lue(p_piece uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select c.id from public.lorani_consultations c
    join public.pieces p on p.id = p_piece and p.objet_id = c.projet_id::text
    join public.lorani_lots l on l.id = c.lot_id
    where c.statut in ('ouverte', 'analysee')
      and (c.dpgf_piece_id = p_piece
           or (c.dpgf_piece_id is null and exists (select 1 from public.pieces_valeurs pv where pv.piece_id = p_piece and pv.champ = 'lot' and pv.chiffre is null
                                                    and private.lorani_lot_comparable(pv.valeur #>> '{}') = private.lorani_lot_comparable(l.numero))))
      and exists (select 1 from public.lorani_offres o where o.consultation_id = c.id)
  loop
    perform private.lorani_analyser_consultation(r.id);
    n := n + 1;
  end loop;
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_offres_dpgf_lue(uuid) FROM PUBLIC;

-- ——— les portes de l'écran ———

CREATE OR REPLACE FUNCTION public.lorani_analyser_offres(p_consultation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_consultations;
begin
  select * into c from public.lorani_consultations where id = p_consultation;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Consultation introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  return private.lorani_analyser_consultation(p_consultation);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_analyser_offres(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_analyser_offres(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.lorani_attribuer_offre(p_offre uuid, p_motif text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  o public.lorani_offres;
  c public.lorani_consultations;
  v_marche uuid;
  v_montant numeric;
begin
  select * into o from public.lorani_offres where id = p_offre;
  if not found or not private.lorani_ecrit_projet(o.client_id, o.entite_id, o.projet_id) then
    raise exception 'Offre introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  select * into c from public.lorani_consultations where id = o.consultation_id for update;
  if c.statut = 'attribuee' then
    raise exception 'Cette consultation est déjà attribuée.' using errcode = '55000';
  end if;
  if o.statut = 'ecartee' then
    raise exception 'Une offre écartée ne peut pas être retenue.' using errcode = '55000';
  end if;
  v_montant := coalesce(o.montant_ht, o.montant_calcule_ht);
  if v_montant is null or v_montant <= 0 then
    raise exception 'L''offre n''a pas de montant : saisissez-le avant de la retenir.' using errcode = '22023';
  end if;
  update public.lorani_offres set statut = 'retenue', motif = coalesce(nullif(btrim(p_motif), ''), motif) where id = o.id;
  update public.lorani_consultations set statut = 'attribuee', offre_retenue = o.id where id = c.id;
  -- le marché du lot, pour les situations de travaux
  select m.id into v_marche from public.lorani_marches m where m.lot_id = c.lot_id and m.actif order by m.cree_le desc limit 1;
  if v_marche is null then
    insert into public.lorani_marches (client_id, entite_id, projet_id, lot_id, titulaire, intervenant_id, montant_ht)
    values (c.client_id, c.entite_id, c.projet_id, c.lot_id, left(o.entreprise, 160), o.intervenant_id, v_montant)
    returning id into v_marche;
  end if;
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.offre_retenue', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('consultation', c.id, 'offre', o.id, 'entreprise', o.entreprise, 'montant_ht', v_montant, 'rang', o.rang,
                       'motif', nullif(btrim(p_motif), ''), 'marche', v_marche), c.entite_id);
  return jsonb_build_object('consultation', c.id, 'offre', o.id, 'marche', v_marche);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_attribuer_offre(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_attribuer_offre(uuid, text) TO authenticated;

-- ——— le passage des lectures (corps de b5_23) : le type lorani_offre, et la DPGF lue qui réanalyse ———

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
      elsif v_type = 'lorani_offre' then
        v_res := private.lorani_poser_offre_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement', 'lorani_metre', 'lorani_cerfa',
                           'lorani_attestation_re2020', 'lorani_plan_bet', 'lorani_notice')
            or exists (select 1 from public.lorani_controle_pieces cp where cp.piece_id = (t.charge ->> 'piece')::uuid) then
        v_res := private.lorani_piece_controle_lue((t.charge ->> 'piece')::uuid);
        if v_type = 'lorani_dpgf' then
          v_res := coalesce(v_res, '{}'::jsonb) || jsonb_build_object('consultations', private.lorani_offres_dpgf_lue((t.charge ->> 'piece')::uuid));
        end if;
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
  for r in select l.projet_id from public.lorani_plu l where l.statut in ('geocodage', 'zonage') or l.complements_statut = 'en_cours' loop
    begin
      perform private.lorani_plu_avancer(r.projet_id);
      perform private.lorani_plu_complements_avancer(r.projet_id);
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
REVOKE EXECUTE ON FUNCTION private.lorani_lectures_passage() FROM PUBLIC;
