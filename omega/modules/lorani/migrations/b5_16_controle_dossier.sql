-- LORANI, lot B5-16 — le contrôle du dossier : les planches croisées entre elles et contre le CCTP, la DPGF et le
-- règlement du PLU, avec la page, la valeur, l'article et la correction proposée ; revérifié à chaque indice.
--
-- Pourquoi : c'est le cœur de la page des architectes (« Cotes, surfaces et reculs, contre les autres planches et le
-- règlement du PLU », « les incohérences du dossier relevées avant le chantier ») et le n° 1 du carnet de l'audit des
-- promesses (omega/AUDIT-PROMESSES.md, § 2 Lorani). Le lecteur d'A1 lit chaque pièce et cite ce qu'il mesure (contrat :
-- omega/modules/lorani/CHAMPS-LECTURE-LORANI.md, « Le contrôle du dossier ») ; ce lot croise.
--
-- Ce qui est posé (droits et héritage comme les autres tables Lorani ; privilèges réduits d'emblée, cf. b5_13b) :
--   · public.lorani_controles : un contrôle d'un projet à un indice (intitulé, indice, contrôle précédent, statut
--     en_lecture | controle | clos, lancé le, nombre de constats).
--   · public.lorani_controle_pieces : les pièces du contrôle (une pièce Lorani du même projet, son rôle planche | cctp |
--     dpgf | plu | autre, sa référence « PC2 »).
--   · public.lorani_constats : ce que le croisement relève (nature incoherence | plu | cctp_dpgf, gravité, grandeur,
--     objet, valeurs citées [{piece, reference, page, boite, valeur, texte}], article, correction proposée, statut
--     ouvert | corrige | accepte | ecarte, motif). Posés par le socle seul ; un membre qui écrit sur le projet ne change
--     que le statut et le motif (motif obligatoire pour accepter ou écarter).
--   · private.lorani_controler(controle) → jsonb : le croisement.
--       1. incohérence : une même grandeur d'un même objet mesurée sur plusieurs pièces avec un écart au-delà de la
--          tolérance (0,05 m, 0,5 m², 0,5 %, 0 pour un nombre) ; correction : aligner, avec la valeur la plus fréquente ;
--       2. PLU : une mesure au-delà d'un maximum ou en deçà d'un minimum du règlement lu ; correction : ramener à la
--          règle, article cité ;
--       3. CCTP / DPGF : un poste décrit et non chiffré, ou chiffré et non décrit.
--     Un nouveau passage sur le même contrôle met à jour ses constats ; un constat disparu passe « corrige ».
--     Revérification à l'indice suivant : un constat ouvert du contrôle précédent qui ne se retrouve plus passe
--     « corrige » (corrigé au contrôle de l'indice suivant) ; celui qui se retrouve est reconduit (lien au précédent) et
--     garde la décision « accepte » ou « ecarte » prise sur l'indice précédent.
--     Alerte au chef de projet (attention s'il y a des constats bloquants) ; journal lorani.controle_passe.
--   · public.lorani_lancer_controle(p_controle) : la porte de l'écran (qui écrit sur le projet).
--   · private.lorani_lectures_passage() (corps de b5_15) : quand une pièce d'un contrôle « en lecture » est lue et que
--     toutes ses pièces le sont, le contrôle se lance seul.
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_controles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  intitule text NOT NULL,
  indice text NOT NULL DEFAULT 'A',
  precedent_id uuid,
  statut text NOT NULL DEFAULT 'en_lecture',
  lance_le timestamptz,
  constats_nb integer NOT NULL DEFAULT 0,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_controles_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_controles_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_controles_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_controles_precedent_fkey FOREIGN KEY (client_id, precedent_id) REFERENCES public.lorani_controles (client_id, id),
  CONSTRAINT lorani_controles_intitule_check CHECK (char_length(btrim(intitule)) BETWEEN 1 AND 160),
  CONSTRAINT lorani_controles_indice_check CHECK (indice ~ '^[0-9A-Za-z.-]{1,6}$'),
  CONSTRAINT lorani_controles_statut_check CHECK (statut = ANY (ARRAY['en_lecture', 'controle', 'clos']))
);
ALTER TABLE public.lorani_controles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_controle_pieces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  controle_id uuid NOT NULL,
  piece_id uuid NOT NULL,
  role text NOT NULL,
  reference text,
  cree_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_controle_pieces_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_controle_pieces_controle_fkey FOREIGN KEY (client_id, controle_id) REFERENCES public.lorani_controles (client_id, id),
  CONSTRAINT lorani_controle_pieces_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_controle_pieces_role_check CHECK (role = ANY (ARRAY['planche', 'cctp', 'dpgf', 'plu', 'autre'])),
  CONSTRAINT lorani_controle_pieces_reference_check CHECK (reference IS NULL OR char_length(btrim(reference)) BETWEEN 1 AND 40),
  CONSTRAINT lorani_controle_pieces_une_fois UNIQUE (controle_id, piece_id)
);
ALTER TABLE public.lorani_controle_pieces ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_constats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  controle_id uuid NOT NULL,
  nature text NOT NULL,
  gravite text NOT NULL,
  grandeur text,
  objet text,
  signature text NOT NULL,
  titre text NOT NULL,
  correction text,
  article text,
  valeurs jsonb NOT NULL DEFAULT '[]'::jsonb,
  statut text NOT NULL DEFAULT 'ouvert',
  motif text,
  precedent_id uuid,
  corrige_au_controle uuid,
  decide_par uuid,
  decide_le timestamptz,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_constats_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_constats_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_constats_controle_fkey FOREIGN KEY (client_id, controle_id) REFERENCES public.lorani_controles (client_id, id),
  CONSTRAINT lorani_constats_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_constats_nature_check CHECK (nature = ANY (ARRAY['incoherence', 'plu', 'cctp_dpgf'])),
  CONSTRAINT lorani_constats_gravite_check CHECK (gravite = ANY (ARRAY['bloquant', 'majeur', 'mineur'])),
  CONSTRAINT lorani_constats_statut_check CHECK (statut = ANY (ARRAY['ouvert', 'corrige', 'accepte', 'ecarte'])),
  CONSTRAINT lorani_constats_titre_check CHECK (char_length(titre) BETWEEN 1 AND 300),
  CONSTRAINT lorani_constats_correction_check CHECK (correction IS NULL OR char_length(correction) <= 1000),
  CONSTRAINT lorani_constats_motif_check CHECK (motif IS NULL OR char_length(motif) <= 500),
  CONSTRAINT lorani_constats_decision_motivee CHECK (statut NOT IN ('accepte', 'ecarte') OR char_length(btrim(coalesce(motif, ''))) >= 3),
  CONSTRAINT lorani_constats_une_fois UNIQUE (controle_id, signature)
);
CREATE INDEX IF NOT EXISTS lorani_constats_projet_idx ON public.lorani_constats (projet_id, statut);
ALTER TABLE public.lorani_constats ENABLE ROW LEVEL SECURITY;

-- Les privilèges par défaut donnent tout à authenticated et anon : on retire tout, puis on rend ce qu'il faut.
REVOKE ALL ON TABLE public.lorani_controles, public.lorani_controle_pieces, public.lorani_constats FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_controles, public.lorani_controle_pieces TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.lorani_constats TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_controles', 'lorani_controle_pieces', 'lorani_constats'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit les controles des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit les controles des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet tient le controle') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet tient le controle', t);
    end if;
  end loop;
  foreach t in array array['lorani_controles', 'lorani_controle_pieces'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet prepare le controle') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet prepare le controle', t);
    end if;
  end loop;
end $$;

-- ——— préparation des lignes ———

CREATE OR REPLACE FUNCTION private.lorani_controles_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.intitule := btrim(regexp_replace(new.intitule, '\s+', ' ', 'g'));
  new.indice := upper(btrim(new.indice));
  if new.precedent_id is not null and not exists (select 1 from public.lorani_controles c where c.id = new.precedent_id and c.projet_id = new.projet_id) then
    raise exception 'Le contrôle précédent doit être du même projet.' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controles_preparer() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_controle_pieces_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
begin
  select * into c from public.lorani_controles where id = new.controle_id;
  if not found then
    raise exception 'Contrôle inconnu.' using errcode = '23503';
  end if;
  new.client_id := c.client_id;
  new.projet_id := c.projet_id;
  if not exists (select 1 from public.pieces p where p.id = new.piece_id and p.client_id = c.client_id and p.module = 'lorani'
                   and p.objet_type = 'lorani_projet' and p.objet_id = c.projet_id::text) then
    raise exception 'Cette pièce n''est pas une pièce de ce projet.' using errcode = '22023';
  end if;
  new.reference := nullif(btrim(new.reference), '');
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controle_pieces_preparer() FROM PUBLIC;

-- Un membre ne change d'un constat que son statut et son motif ; la décision se date.
CREATE OR REPLACE FUNCTION private.lorani_constats_garder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and current_setting('lorani.controle_en_cours', true) is distinct from 'oui' then
    if (new.controle_id, new.nature, new.gravite, new.grandeur, new.objet, new.signature, new.titre, new.correction, new.article, new.valeurs,
        new.precedent_id, new.corrige_au_controle)
       is distinct from
       (old.controle_id, old.nature, old.gravite, old.grandeur, old.objet, old.signature, old.titre, old.correction, old.article, old.valeurs,
        old.precedent_id, old.corrige_au_controle) then
      raise exception 'Un constat se décide (statut et motif) ; son contenu vient du contrôle.' using errcode = '42501';
    end if;
    if new.statut is distinct from old.statut then
      new.decide_par := (select auth.uid());
      new.decide_le := now();
    end if;
  end if;
  new.motif := nullif(btrim(new.motif), '');
  new.maj_le := now();
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_constats_garder() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controles'::regclass and tgname = 'lorani_controles_heriter_projet') then
    create trigger lorani_controles_heriter_projet before insert or update of projet_id, entite_id on public.lorani_controles
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controles'::regclass and tgname = 'lorani_controles_preparer') then
    create trigger lorani_controles_preparer before insert or update on public.lorani_controles
      for each row execute function private.lorani_controles_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controle_pieces'::regclass and tgname = 'lorani_controle_pieces_a_preparer') then
    create trigger lorani_controle_pieces_a_preparer before insert or update on public.lorani_controle_pieces
      for each row execute function private.lorani_controle_pieces_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controle_pieces'::regclass and tgname = 'lorani_controle_pieces_heriter_projet') then
    create trigger lorani_controle_pieces_heriter_projet before insert or update of projet_id, entite_id on public.lorani_controle_pieces
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_constats'::regclass and tgname = 'lorani_constats_garder') then
    create trigger lorani_constats_garder before update on public.lorani_constats
      for each row execute function private.lorani_constats_garder();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_constats'::regclass and tgname = 'lorani_constats_tracer') then
    create trigger lorani_constats_tracer after insert or update on public.lorani_constats
      for each row execute function private.tracer('+controle_id', '+nature', '+signature', '+statut', '+motif');
  end if;
end $$;

-- ——— le vocabulaire ———

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
    when 'espaces_verts_pct' then '{"libelle": "la part d''espaces verts", "unite": "%", "tolerance": 0.5}'
    when 'pleine_terre_pct' then '{"libelle": "la part de pleine terre", "unite": "%", "tolerance": 0.5}'
    when 'stationnement_nb' then '{"libelle": "le nombre de places de stationnement", "unite": "", "tolerance": 0}'
    when 'logements_nb' then '{"libelle": "le nombre de logements", "unite": "", "tolerance": 0}'
    when 'niveaux_nb' then '{"libelle": "le nombre de niveaux", "unite": "", "tolerance": 0}'
    when 'pente_toiture_pct' then '{"libelle": "la pente de toiture", "unite": "%", "tolerance": 0.5}'
    when 'longueur_m' then '{"libelle": "la longueur", "unite": "m", "tolerance": 0.05}'
    when 'largeur_m' then '{"libelle": "la largeur", "unite": "m", "tolerance": 0.05}'
    when 'cote_altimetrique_m' then '{"libelle": "la cote altimétrique", "unite": "m NGF", "tolerance": 0.05}'
  end::jsonb
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_grandeur(text) FROM PUBLIC;

-- « 9,85 m », « 312,4 m² », « 12 »
CREATE OR REPLACE FUNCTION private.lorani_mesure_texte(p_valeur numeric, p_grandeur text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select btrim(replace(rtrim(rtrim(to_char(p_valeur, 'FM999999990.99'), '0'), '.'), '.', ',') || ' ' || coalesce(private.lorani_grandeur(p_grandeur) ->> 'unite', ''))
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_mesure_texte(numeric, text) FROM PUBLIC;

-- « » pour l'ensemble du projet, « de « bâtiment a » » pour un objet nommé.
CREATE OR REPLACE FUNCTION private.lorani_objet_de(p_objet text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case when p_objet is null or p_objet = 'projet' then '' else ' de « ' || replace(p_objet, '_', ' ') || ' »' end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_objet_de(text) FROM PUBLIC;

-- ——— le croisement ———

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

-- La porte de l'écran.
CREATE OR REPLACE FUNCTION public.lorani_lancer_controle(p_controle uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
begin
  select * into c from public.lorani_controles where id = p_controle;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  return private.lorani_controler(p_controle);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_lancer_controle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_lancer_controle(uuid) TO authenticated;

-- Une pièce d'un contrôle vient d'être lue : si toutes les pièces du contrôle le sont, il se lance.
CREATE OR REPLACE FUNCTION private.lorani_piece_controle_lue(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  v_lances jsonb := '[]'::jsonb;
begin
  for c in
    select distinct k.id from public.lorani_controle_pieces cp join public.lorani_controles k on k.id = cp.controle_id
    where cp.piece_id = p_piece and k.statut = 'en_lecture'
      and not exists (select 1 from public.lorani_controle_pieces cp2 join public.pieces p on p.id = cp2.piece_id
                      where cp2.controle_id = k.id and p.statut in ('recue', 'en_lecture', 'a_rattacher', 'en_attente_expediteur'))
  loop
    v_lances := v_lances || private.lorani_controler(c.id);
  end loop;
  return jsonb_build_object('piece', p_piece, 'controles', v_lances);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_piece_controle_lue(uuid) FROM PUBLIC;

-- Le passage des lectures (corps de b5_15) : les pièces d'un contrôle lancent le contrôle quand tout est lu.
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
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse'],
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
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement')
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
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences);
end $function$;
