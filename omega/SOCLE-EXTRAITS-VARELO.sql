-- Extraits du socle Omega pour Varelo (groupes, référentiel, rapprochement) — préfixe grp_
-- Recette ygwbgpowzlbdaajlsqkn, photographie du 5 octobre 2026, 22 h 30, par le coordinateur.
-- Ce fichier NE S'EXÉCUTE PAS : il sert à écrire des « create or replace », des écrans et des tests.
-- Les ouvriers n'appellent jamais Supabase ; ce qui manque ici se demande au coordinateur.
-- Contenu : 7 tables, 2 vues, 85 fonctions, 3 crons.


-- ══════════════════ TABLES ══════════════════

-- ═══ TABLE public.grp_installations
  client_id uuid not null
  equipe_referent text not null default 'referent_donnees'::text
  seuil_sur numeric(4,3) not null default 0.970
  seuil_probable numeric(4,3) not null default 0.800
  taille_lot smallint not null default 50
  bloc_max smallint not null default 300
  iban_partage_max smallint not null default 3
  installe_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint grp_installations_bloc_max_check CHECK (((bloc_max >= 10) AND (bloc_max <= 5000)))
  constraint grp_installations_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_installations_equipe_referent_check CHECK ((equipe_referent ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint grp_installations_iban_partage_max_check CHECK (((iban_partage_max >= 1) AND (iban_partage_max <= 50)))
  constraint grp_installations_pkey PRIMARY KEY (client_id)
  constraint grp_installations_seuil_probable_check CHECK ((seuil_probable > (0)::numeric))
  constraint grp_installations_seuil_sur_check CHECK (((seuil_sur > (0)::numeric) AND (seuil_sur <= (1)::numeric)))
  constraint grp_installations_seuils CHECK ((seuil_probable < seuil_sur))
  constraint grp_installations_taille_lot_check CHECK (((taille_lot >= 1) AND (taille_lot <= 50)))
  policy "membres lisent l'installation" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER grp_installations_tracer AFTER INSERT OR UPDATE ON public.grp_installations FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  grants authenticated: SELECT

-- ═══ TABLE public.grp_poles
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  cle text not null
  nom text not null
  ordre smallint not null default 0
  cree_le timestamp with time zone not null default now()
  constraint grp_poles_cle_check CHECK ((cle ~ '^[a-z][a-z0-9_]{1,39}$'::text))
  constraint grp_poles_cle_key UNIQUE (client_id, cle)
  constraint grp_poles_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_poles_client_id_id_key UNIQUE (client_id, id)
  constraint grp_poles_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 120)))
  constraint grp_poles_pkey PRIMARY KEY (id)
  policy "gerants et admins creent les poles" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins modifient les poles" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins retirent les poles" DELETE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check ()
  policy "membres lisent les poles" SELECT to authenticated using ((client_id IN ( SELECT private.mes_clients() AS mes_clients))) with check ()
  CREATE TRIGGER grp_poles_tracer AFTER INSERT OR DELETE OR UPDATE ON public.grp_poles FOR EACH ROW EXECUTE FUNCTION private.tracer()
  grants authenticated: DELETE,INSERT,SELECT,UPDATE

-- ═══ TABLE public.grp_ref_codes
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  entite_id uuid not null
  nature text not null
  code_local text not null
  nom_local text not null
  nom_normalise text not null
  jetons text[] not null default '{}'::text[]
  bloc text
  siren text
  tva text
  iban_empreinte text
  gtin text
  ref_fournisseur text
  fournisseur_code text
  unite text
  adresse text
  adresse_normalisee text
  code_postal text
  ville text
  pays text
  telephone_cle text
  domaine_email text
  type_site text
  anomalies jsonb not null default '{}'::jsonb
  empreinte text not null
  actif boolean not null default true
  source_ref text
  a_rapprocher boolean not null default true
  objet_id uuid
  etat text not null default 'a_traiter'::text
  methode text
  score numeric(4,3)
  demande_id uuid
  rattache_le timestamp with time zone
  lu_le timestamp with time zone not null default now()
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint grp_ref_codes_adresse_check CHECK ((char_length(adresse) <= 300))
  constraint grp_ref_codes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_ref_codes_client_id_id_key UNIQUE (client_id, id)
  constraint grp_ref_codes_code_local_check CHECK (((char_length(code_local) >= 1) AND (char_length(code_local) <= 80)))
  constraint grp_ref_codes_code_postal_check CHECK ((code_postal ~ '^[0-9]{5}$'::text))
  constraint grp_ref_codes_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id) ON DELETE SET NULL
  constraint grp_ref_codes_domaine_email_check CHECK ((char_length(domaine_email) <= 120))
  constraint grp_ref_codes_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint grp_ref_codes_etat_check CHECK ((etat = ANY (ARRAY['a_traiter'::text, 'nouveau'::text, 'propose'::text, 'confirme'::text])))
  constraint grp_ref_codes_fournisseur_code_check CHECK ((char_length(fournisseur_code) <= 80))
  constraint grp_ref_codes_gtin_check CHECK ((gtin ~ '^[0-9]{14}$'::text))
  constraint grp_ref_codes_iban_empreinte_check CHECK ((iban_empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint grp_ref_codes_methode_check CHECK ((methode = ANY (ARRAY['nouveau'::text, 'siren'::text, 'tva'::text, 'iban'::text, 'gtin'::text, 'ref_fournisseur'::text, 'nom_cp'::text, 'similarite'::text, 'humain'::text, 'rejet'::text])))
  constraint grp_ref_codes_nature_check CHECK ((nature = ANY (ARRAY['client'::text, 'fournisseur'::text, 'article'::text, 'site'::text])))
  constraint grp_ref_codes_nom_local_check CHECK (((char_length(btrim(nom_local)) >= 1) AND (char_length(btrim(nom_local)) <= 200)))
  constraint grp_ref_codes_objet_fkey FOREIGN KEY (objet_id, client_id, nature) REFERENCES grp_ref_objets(id, client_id, nature)
  constraint grp_ref_codes_pays_check CHECK ((pays ~ '^[A-Z]{2}$'::text))
  constraint grp_ref_codes_pkey PRIMARY KEY (id)
  constraint grp_ref_codes_rattache CHECK (((etat = 'a_traiter'::text) = (objet_id IS NULL)))
  constraint grp_ref_codes_ref_fournisseur_check CHECK ((char_length(ref_fournisseur) <= 80))
  constraint grp_ref_codes_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric)))
  constraint grp_ref_codes_siren_check CHECK ((siren ~ '^[0-9]{9}$'::text))
  constraint grp_ref_codes_societe_fkey FOREIGN KEY (client_id, entite_id) REFERENCES grp_societes(client_id, entite_id)
  constraint grp_ref_codes_source_ref_check CHECK ((char_length(source_ref) <= 200))
  constraint grp_ref_codes_telephone_cle_check CHECK ((telephone_cle ~ '^[0-9]{9}$'::text))
  constraint grp_ref_codes_tva_check CHECK ((char_length(tva) <= 20))
  constraint grp_ref_codes_type_site_check CHECK ((char_length(type_site) <= 60))
  constraint grp_ref_codes_une_fois UNIQUE (client_id, entite_id, nature, code_local)
  constraint grp_ref_codes_unite_check CHECK ((char_length(unite) <= 30))
  constraint grp_ref_codes_ville_check CHECK ((char_length(ville) <= 120))
  policy "membres lisent les codes de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER grp_ref_codes_garder BEFORE INSERT OR UPDATE OF etat, objet_id ON public.grp_ref_codes FOR EACH ROW EXECUTE FUNCTION private.grp_garder_code()
  CREATE TRIGGER grp_ref_codes_tracer AFTER DELETE OR UPDATE ON public.grp_ref_codes FOR EACH ROW EXECUTE FUNCTION private.tracer('+entite_id', '+nature', '+code_local', '+objet_id', '+etat', '+methode', '+score', '+demande_id', '+actif')
  grants authenticated: SELECT

-- ═══ TABLE public.grp_ref_compteurs
  client_id uuid not null
  nature text not null
  dernier integer not null default 0
  constraint grp_ref_compteurs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_ref_compteurs_dernier_check CHECK ((dernier >= 0))
  constraint grp_ref_compteurs_nature_check CHECK ((nature = ANY (ARRAY['client'::text, 'fournisseur'::text, 'article'::text, 'site'::text])))
  constraint grp_ref_compteurs_pkey PRIMARY KEY (client_id, nature)


  grants authenticated: aucun

-- ═══ TABLE public.grp_ref_objets
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  nature text not null
  numero integer not null
  code_groupe text default ((
CASE nature
    WHEN 'client'::text THEN 'C'::text
    WHEN 'fournisseur'::text THEN 'F'::text
    WHEN 'article'::text THEN 'A'::text
    ELSE 'S'::text
END || '-'::text) ||
CASE
    WHEN (numero < 100000) THEN lpad((numero)::text, 5, '0'::text)
    ELSE (numero)::text
END)
  nom_groupe text not null
  nom_origine text not null default 'auto'::text
  intragroupe boolean not null default false
  intragroupe_entite_id uuid
  entite_id uuid
  statut text not null default 'actif'::text
  fusionne_dans uuid
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint grp_ref_objets_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_ref_objets_client_id_id_key UNIQUE (client_id, id)
  constraint grp_ref_objets_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE SET NULL (entite_id)
  constraint grp_ref_objets_fusion CHECK ((((statut = 'fusionne'::text) = (fusionne_dans IS NOT NULL)) AND (fusionne_dans IS DISTINCT FROM id)))
  constraint grp_ref_objets_fusion_fkey FOREIGN KEY (fusionne_dans, client_id, nature) REFERENCES grp_ref_objets(id, client_id, nature)
  constraint grp_ref_objets_intragroupe_fkey FOREIGN KEY (client_id, intragroupe_entite_id) REFERENCES entites(client_id, id) ON DELETE SET NULL (intragroupe_entite_id)
  constraint grp_ref_objets_nature_check CHECK ((nature = ANY (ARRAY['client'::text, 'fournisseur'::text, 'article'::text, 'site'::text])))
  constraint grp_ref_objets_nature_id_key UNIQUE (client_id, nature, id)
  constraint grp_ref_objets_nom_groupe_check CHECK (((char_length(btrim(nom_groupe)) >= 1) AND (char_length(btrim(nom_groupe)) <= 200)))
  constraint grp_ref_objets_nom_origine_check CHECK ((nom_origine = ANY (ARRAY['auto'::text, 'humain'::text])))
  constraint grp_ref_objets_numero_check CHECK ((numero > 0))
  constraint grp_ref_objets_numero_key UNIQUE (client_id, nature, numero)
  constraint grp_ref_objets_pkey PRIMARY KEY (id)
  constraint grp_ref_objets_statut_check CHECK ((statut = ANY (ARRAY['actif'::text, 'fusionne'::text])))
  policy "membres lisent les objets qui ont un code dans leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.grp_perimetre_total(client_id) OR (EXISTS ( SELECT 1
   FROM grp_ref_codes c
  WHERE ((c.client_id = grp_ref_objets.client_id) AND (c.objet_id = grp_ref_objets.id))))))) with check ()
  CREATE TRIGGER grp_ref_objets_garder BEFORE UPDATE ON public.grp_ref_objets FOR EACH ROW EXECUTE FUNCTION private.grp_garder_objet()
  CREATE TRIGGER grp_ref_objets_tracer AFTER INSERT OR UPDATE ON public.grp_ref_objets FOR EACH ROW EXECUTE FUNCTION private.tracer('+nature', '+numero', '+code_groupe', '+nom_origine', '+statut', '+fusionne_dans', '+intragroupe', '+intragroupe_entite_id', '+entite_id')
  grants authenticated: SELECT

-- ═══ TABLE public.grp_ref_propositions
  id uuid not null default gen_random_uuid()
  client_id uuid not null
  nature text not null
  genre text not null
  preuve text not null
  type_action text not null
  code_id uuid
  codes uuid[]
  objet_source uuid
  objet_cible uuid not null
  nom text
  regle text
  score numeric(4,3)
  raisons jsonb not null default '[]'::jsonb
  preuves uuid[] not null default '{}'::uuid[]
  cle_paire text not null
  empreinte text not null
  statut text not null default 'a_valider'::text
  demande_id uuid
  motif text
  decide_par uuid
  cree_le timestamp with time zone not null default now()
  traite_le timestamp with time zone
  constraint grp_ref_propositions_cible_fkey FOREIGN KEY (objet_cible, client_id, nature) REFERENCES grp_ref_objets(id, client_id, nature)
  constraint grp_ref_propositions_cle_paire_check CHECK ((char_length(cle_paire) <= 200))
  constraint grp_ref_propositions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_ref_propositions_code_fkey FOREIGN KEY (code_id, client_id) REFERENCES grp_ref_codes(id, client_id) ON DELETE CASCADE
  constraint grp_ref_propositions_demande_id_fkey FOREIGN KEY (demande_id) REFERENCES demandes_validation(id) ON DELETE SET NULL
  constraint grp_ref_propositions_empreinte_check CHECK ((empreinte ~ '^[0-9a-f]{64}$'::text))
  constraint grp_ref_propositions_forme CHECK ((((genre = ANY (ARRAY['placer'::text, 'deplacer'::text, 'detacher'::text])) AND (code_id IS NOT NULL)) OR ((genre = 'fusionner'::text) AND (objet_source IS NOT NULL) AND (objet_source <> objet_cible)) OR ((genre = 'scinder'::text) AND (COALESCE(cardinality(codes), 0) >= 1)) OR ((genre = 'renommer'::text) AND (nom IS NOT NULL))))
  constraint grp_ref_propositions_genre_check CHECK ((genre = ANY (ARRAY['placer'::text, 'deplacer'::text, 'fusionner'::text, 'detacher'::text, 'scinder'::text, 'renommer'::text])))
  constraint grp_ref_propositions_motif_check CHECK ((char_length(motif) <= 500))
  constraint grp_ref_propositions_nature_check CHECK ((nature = ANY (ARRAY['client'::text, 'fournisseur'::text, 'article'::text, 'site'::text])))
  constraint grp_ref_propositions_nom_check CHECK (((char_length(btrim(nom)) >= 1) AND (char_length(btrim(nom)) <= 200)))
  constraint grp_ref_propositions_pkey PRIMARY KEY (id)
  constraint grp_ref_propositions_preuve_check CHECK ((preuve = ANY (ARRAY['sure'::text, 'probable'::text, 'humaine'::text])))
  constraint grp_ref_propositions_regle_check CHECK ((char_length(regle) <= 40))
  constraint grp_ref_propositions_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric)))
  constraint grp_ref_propositions_source_fkey FOREIGN KEY (objet_source, client_id, nature) REFERENCES grp_ref_objets(id, client_id, nature)
  constraint grp_ref_propositions_statut_check CHECK ((statut = ANY (ARRAY['a_valider'::text, 'ecartee'::text, 'executee'::text, 'rejetee'::text, 'perimee'::text])))
  constraint grp_ref_propositions_type_action_check CHECK ((type_action = ANY (ARRAY['rattacher_codes'::text, 'rapprocher_codes'::text, 'rattacher_iban_different'::text, 'fusionner_objets'::text, 'detacher_code'::text, 'scinder_objet'::text, 'renommer_objet'::text])))
  policy "membres lisent les propositions de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND (private.grp_perimetre_total(client_id) OR ((code_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM grp_ref_codes c
  WHERE (c.id = grp_ref_propositions.code_id)))) OR ((code_id IS NULL) AND (EXISTS ( SELECT 1
   FROM grp_ref_codes c
  WHERE (c.objet_id = ANY (ARRAY[grp_ref_propositions.objet_source, grp_ref_propositions.objet_cible])))))))) with check ()
  CREATE TRIGGER grp_ref_propositions_tracer AFTER INSERT OR UPDATE ON public.grp_ref_propositions FOR EACH ROW EXECUTE FUNCTION private.tracer('+nature', '+genre', '+preuve', '+type_action', '+code_id', '+objet_source', '+objet_cible', '+regle', '+score', '+statut', '+demande_id', '+decide_par')
  grants authenticated: SELECT

-- ═══ TABLE public.grp_societes
  entite_id uuid not null
  client_id uuid not null
  pole_id uuid
  logiciel text
  nomenclature text
  statut_branchement text not null default 'a_brancher'::text
  cree_le timestamp with time zone not null default now()
  maj_le timestamp with time zone not null default now()
  constraint grp_societes_client_entite_key UNIQUE (client_id, entite_id)
  constraint grp_societes_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  constraint grp_societes_entite_fkey FOREIGN KEY (client_id, entite_id) REFERENCES entites(client_id, id) ON DELETE CASCADE
  constraint grp_societes_logiciel_check CHECK ((char_length(logiciel) <= 120))
  constraint grp_societes_nomenclature_check CHECK ((char_length(nomenclature) <= 200))
  constraint grp_societes_pkey PRIMARY KEY (entite_id)
  constraint grp_societes_pole_fkey FOREIGN KEY (client_id, pole_id) REFERENCES grp_poles(client_id, id) ON DELETE SET NULL (pole_id)
  constraint grp_societes_statut_branchement_check CHECK ((statut_branchement = ANY (ARRAY['a_brancher'::text, 'observation'::text, 'active'::text, 'suspendue'::text])))
  policy "gerants et admins inscrivent les societes" INSERT to authenticated using () with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "gerants et admins reglent les societes" UPDATE to authenticated using (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text])) with check (private.a_un_role(client_id, ARRAY['gerant'::text, 'admin'::text]))
  policy "membres lisent les societes de leur perimetre" SELECT to authenticated using (((client_id IN ( SELECT private.mes_clients() AS mes_clients)) AND private.voit_entite(client_id, entite_id))) with check ()
  CREATE TRIGGER grp_societes_tracer AFTER INSERT OR DELETE OR UPDATE ON public.grp_societes FOR EACH ROW EXECUTE FUNCTION private.tracer('maj_le')
  CREATE TRIGGER grp_societes_verifier BEFORE INSERT ON public.grp_societes FOR EACH ROW EXECUTE FUNCTION private.grp_verifier_societe()
  grants authenticated: INSERT,SELECT,UPDATE


-- ══════════════════ VUES ══════════════════

-- ═══ VUE public.grp_referentiel_codes
 SELECT c.id AS code_id,
    c.client_id,
    c.nature,
    c.entite_id,
    e.nom AS societe,
    c.code_local,
    c.nom_local,
    o.id AS objet_id,
    o.code_groupe,
    o.nom_groupe,
    o.intragroupe,
    c.etat,
    c.methode,
    c.score,
    c.actif,
    c.anomalies,
    c.rattache_le
   FROM grp_ref_codes c
     JOIN entites e ON e.client_id = c.client_id AND e.id = c.entite_id
     LEFT JOIN grp_ref_objets o ON o.client_id = c.client_id AND o.id = c.objet_id;

-- ═══ VUE public.grp_societes_vue
 SELECT s.entite_id,
    s.client_id,
    e.nom,
    e.siren,
    e.parent_id,
    e.principale,
    s.pole_id,
    p.nom AS pole,
    e.territoire AS territoire_iso,
    t.code AS territoire,
    t.libelle AS territoire_libelle,
    e.fuseau,
    s.logiciel,
    s.nomenclature,
    s.statut_branchement
   FROM grp_societes s
     JOIN entites e ON e.client_id = s.client_id AND e.id = s.entite_id
     LEFT JOIN grp_poles p ON p.client_id = s.client_id AND p.id = s.pole_id
     LEFT JOIN territoires t ON t.code = territoire_de_entite(s.client_id, s.entite_id);


-- ══════════════════ FONCTIONS (public et private, telles quelles) ══════════════════

-- ═══ FONCTION private.grp_adresse_normalisee
CREATE OR REPLACE FUNCTION private.grp_adresse_normalisee(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v text;
  w text;
  r text[] := '{}';
begin
  if p is null or btrim(p) = '' then
    return null;
  end if;
  v := ' ' || private.grp_texte_normalise(p) || ' ';
  v := regexp_replace(v, ' (BP|CS|TSA) ?[0-9]+ ', ' ', 'g');
  v := regexp_replace(v, ' CEDEX( [0-9]+)? ', ' ', 'g');
  v := replace(v, ' ZONE INDUSTRIELLE ', ' ZI ');
  v := replace(v, ' ZONE ARTISANALE ', ' ZA ');
  v := replace(v, ' ZONE D ACTIVITES ', ' ZA ');
  v := replace(v, ' ZONE D ACTIVITE ', ' ZA ');
  v := replace(v, ' ZONE COMMERCIALE ', ' ZC ');
  v := replace(v, ' CENTRE COMMERCIAL ', ' CC ');
  foreach w in array string_to_array(btrim(v), ' ') loop
    continue when w = '' or w = any (array['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'L', 'D', 'ET', 'A', 'AU', 'AUX']);
    r := r || case w
      when 'AVENUE' then 'AV' when 'BOULEVARD' then 'BD' when 'CHEMIN' then 'CHE' when 'ROUTE' then 'RTE'
      when 'IMPASSE' then 'IMP' when 'ALLEE' then 'ALL' when 'PLACE' then 'PL' when 'RESIDENCE' then 'RES'
      when 'IMMEUBLE' then 'IMM' when 'LOTISSEMENT' then 'LOT' when 'QUARTIER' then 'QUA' when 'BATIMENT' then 'BAT'
      when 'APPARTEMENT' then 'APT' when 'SAINT' then 'ST' when 'SAINTE' then 'STE' when 'FAUBOURG' then 'FG'
      when 'SQUARE' then 'SQ' when 'LIEUDIT' then 'LD' when 'RUELLE' then 'RLE' when 'PROMENADE' then 'PROM'
      else w end;
  end loop;
  return nullif(array_to_string(r, ' '), '');
end $function$


-- ═══ FONCTION private.grp_appliquer_proposition
CREATE OR REPLACE FUNCTION private.grp_appliquer_proposition(p_prop uuid, p_demande uuid, p_iban_max integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.grp_ref_propositions;
  c public.grp_ref_codes;
  v_nouveau uuid;
  v_premier public.grp_ref_codes;
begin
  select * into p from public.grp_ref_propositions k where k.id = p_prop for update;
  if p.statut <> 'a_valider' then
    return 'deja';
  end if;
  if p.code_id is not null then
    select * into c from public.grp_ref_codes k where k.id = p.code_id for update;
  end if;
  if p.genre = 'placer' then
    if c.etat <> 'propose' or c.objet_id <> p.objet_cible then
      return 'Le code n''est plus à cette place.';
    end if;
    if not private.grp_preuve_tient(p.code_id, p.objet_cible, p.regle, p.preuves, p_iban_max) then
      return 'La preuve ne tient plus.';
    end if;
    update public.grp_ref_codes set etat = 'confirme', demande_id = p_demande, rattache_le = now(), a_rapprocher = true
     where id = p.code_id;
  elsif p.genre = 'deplacer' then
    if c.objet_id <> p.objet_source or c.etat not in ('nouveau', 'confirme') then
      return 'Le code a changé de place.';
    end if;
    if not exists (select 1 from public.grp_ref_objets o where o.id = p.objet_cible and o.statut = 'actif') then
      return 'L''objet d''arrivée n''existe plus.';
    end if;
    if p.preuve <> 'humaine' then
      if (select count(*) from public.grp_ref_codes y where y.objet_id = p.objet_source) <> 1 then
        return 'L''objet de départ a reçu d''autres codes.';
      end if;
      if private.grp_empreinte_codes(p.cle_paire, array[p.code_id]) <> p.empreinte then
        return 'Le code a changé depuis la proposition.';
      end if;
      if p.preuve = 'sure' and not private.grp_preuve_tient(p.code_id, p.objet_cible, p.regle, p.preuves, p_iban_max) then
        return 'La preuve ne tient plus.';
      end if;
      if p.preuve = 'probable'
         and not exists (select 1 from public.grp_ref_codes x where x.id = any (p.preuves) and x.objet_id = p.objet_cible) then
        return 'Le code comparé a quitté l''objet.';
      end if;
    end if;
    update public.grp_ref_codes
       set objet_id = p.objet_cible, etat = 'confirme', methode = case when p.preuve = 'humaine' then 'humain' else p.regle end,
           score = p.score, demande_id = p_demande, rattache_le = now(), a_rapprocher = true
     where id = p.code_id;
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = p.objet_source) then
      perform private.grp_fusionner_objet(p.objet_source, p.objet_cible);
    end if;
  elsif p.genre = 'fusionner' then
    if not exists (select 1 from public.grp_ref_objets o where o.id = p.objet_source and o.statut = 'actif')
       or not exists (select 1 from public.grp_ref_objets o where o.id = p.objet_cible and o.statut = 'actif') then
      return 'Un des deux objets n''existe plus.';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.objet_id = p.objet_source and y.etat = 'propose') then
      return 'L''objet de départ a des rattachements qui attendent leur validation.';
    end if;
    if p.preuve <> 'humaine' then
      if private.grp_empreinte_codes(p.cle_paire,
           (select array_agg(y.id) from public.grp_ref_codes y where y.objet_id in (p.objet_source, p.objet_cible))) <> p.empreinte then
        return 'Les deux objets ont changé depuis la proposition.';
      end if;
      if p.preuve = 'sure' and not private.grp_preuve_tient(p.code_id, p.objet_cible, p.regle, p.preuves, p_iban_max) then
        return 'La preuve ne tient plus.';
      end if;
    end if;
    update public.grp_ref_codes
       set objet_id = p.objet_cible, etat = 'confirme', methode = case when p.preuve = 'humaine' then 'humain' else p.regle end,
           score = p.score, demande_id = p_demande, rattache_le = now(), a_rapprocher = true
     where objet_id = p.objet_source;
    perform private.grp_fusionner_objet(p.objet_source, p.objet_cible);
  elsif p.genre = 'detacher' then
    if c.objet_id <> p.objet_cible then
      return 'Le code a changé de place.';
    end if;
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = p.objet_cible and y.id <> c.id) then
      return 'Le dernier code d''un objet ne se détache pas.';
    end if;
    if p.preuve = 'sure' and not exists (
         select 1 from public.grp_ref_codes y where y.objet_id = p.objet_cible and y.id <> c.id
           and ((p.regle = 'siren' and y.siren is not null and y.siren is distinct from c.siren)
             or (p.regle = 'gtin' and y.gtin is not null and y.gtin is distinct from c.gtin))) then
      return 'Les identifiants ne se contredisent plus.';
    end if;
    update public.grp_ref_propositions set statut = 'rejetee', motif = 'Détaché par une décision.', traite_le = now()
     where code_id = c.id and genre = 'placer' and statut = 'a_valider' and id <> p.id;
    v_nouveau := private.grp_creer_objet(c.client_id, c.nature, c.nom_local);
    update public.grp_ref_codes
       set objet_id = v_nouveau, etat = 'nouveau', methode = 'humain', score = null, demande_id = p_demande,
           rattache_le = now(), a_rapprocher = false
     where id = c.id;
  elsif p.genre = 'scinder' then
    if exists (select 1 from unnest(p.codes) as k(id) left join public.grp_ref_codes y on y.id = k.id
               where y.objet_id is distinct from p.objet_cible) then
      return 'Un des codes a changé de place.';
    end if;
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = p.objet_cible and not (y.id = any (p.codes))) then
      return 'Une scission laisse au moins un code à l''objet.';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.id = any (p.codes) and y.etat = 'propose') then
      return 'Un des codes attend encore sa validation.';
    end if;
    select * into v_premier from public.grp_ref_codes y where y.id = any (p.codes)
    order by char_length(y.nom_normalise) desc, y.id limit 1;
    v_nouveau := private.grp_creer_objet(p.client_id, p.nature, v_premier.nom_local);
    update public.grp_ref_codes
       set objet_id = v_nouveau, etat = 'confirme', methode = 'humain', score = null, demande_id = p_demande,
           rattache_le = now(), a_rapprocher = false
     where id = any (p.codes);
    perform private.grp_renommer_auto(v_nouveau);
  elsif p.genre = 'renommer' then
    update public.grp_ref_objets set nom_groupe = p.nom, nom_origine = 'humain' where id = p.objet_cible and statut = 'actif';
    if not found then
      return 'L''objet n''existe plus.';
    end if;
  end if;
  perform private.grp_renommer_auto(p.objet_cible);
  perform private.grp_marquer_intragroupe(p.client_id, array_remove(array[p.objet_cible, v_nouveau], null));
  return 'executee';
end $function$


-- ═══ FONCTION private.grp_code_compatible
CREATE OR REPLACE FUNCTION private.grp_code_compatible(p_code uuid, p_objet uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return not exists (
    select 1 from public.grp_ref_codes c, public.grp_ref_codes y
    where c.id = p_code and y.objet_id = p_objet and y.id <> c.id
      and ((c.siren is not null and y.siren is not null and y.siren <> c.siren)
        or (c.gtin is not null and y.gtin is not null and y.gtin <> c.gtin)
        or (c.tva is not null and y.tva is not null and y.tva <> c.tva)));
end $function$


-- ═══ FONCTION private.grp_code_postal
CREATE OR REPLACE FUNCTION private.grp_code_postal(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(substring(coalesce(p, '') from '\m([0-9]{5})\M'),
                  case when btrim(coalesce(p, '')) ~ '^[0-9]{4}$' then lpad(btrim(p), 5, '0') end)
$function$


-- ═══ FONCTION private.grp_controler_societes
CREATE OR REPLACE FUNCTION private.grp_controler_societes()
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
    select s.client_id, s.entite_id, e.nom, e.territoire, e.fuseau, t.code as territoire_calendrier, t.fuseau as fuseau_attendu
    from public.grp_societes s
    join public.entites e on e.client_id = s.client_id and e.id = s.entite_id
    left join public.territoires t on t.code = public.territoire_calendrier(e.territoire)
    where t.code is null
       or (e.fuseau <> t.fuseau and not (t.code = 'polynesie-francaise' and e.fuseau in ('Pacific/Marquesas', 'Pacific/Gambier')))
  loop
    if private.lever_alerte_module(r.client_id, 'varelo', 'attention',
         left(format('Société « %s » : territoire ou fuseau à revoir', r.nom), 200),
         jsonb_build_object('entite', r.entite_id, 'territoire', r.territoire, 'fuseau', r.fuseau, 'fuseau_attendu', r.fuseau_attendu),
         'societe:' || r.entite_id::text, true) is not null then
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.grp_creer_objet
CREATE OR REPLACE FUNCTION private.grp_creer_objet(p_client uuid, p_nature text, p_nom text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_numero integer;
  v_id uuid;
begin
  insert into public.grp_ref_compteurs as k (client_id, nature, dernier) values (p_client, p_nature, 1)
  on conflict (client_id, nature) do update set dernier = k.dernier + 1
  returning k.dernier into v_numero;
  insert into public.grp_ref_objets (client_id, nature, numero, nom_groupe)
  values (p_client, p_nature, v_numero, coalesce(private.grp_nom_affichage(p_nom), left(btrim(p_nom), 200)))
  returning id into v_id;
  return v_id;
end $function$


-- ═══ FONCTION private.grp_csv
CREATE OR REPLACE FUNCTION private.grp_csv(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when p is null then ''
    else (select case when v ~ '[;"\r\n]' or v <> btrim(v) then '"' || replace(v, '"', '""') || '"' else v end
          from (select case when p ~ '^[=+@\t\r]' or p ~ '^-[^0-9 ]' then '''' || p else p end as v) x) end
$function$


-- ═══ FONCTION private.grp_demander_rapprochement
CREATE OR REPLACE FUNCTION private.grp_demander_rapprochement(p_client uuid, p_complet boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.grp_exiger_installation(p_client);
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
    raise exception 'Un passage se demande par un gérant, un administrateur ou un valideur.' using errcode = '42501';
  end if;
  return private.deposer_travail(p_client, 'varelo', 'varelo.referentiel.rapprocher', jsonb_build_object('complet', p_complet),
    'rapprocher' || case when p_complet then '-complet' else '' end || ':' || p_client::text, 0::smallint);
end $function$


-- ═══ FONCTION private.grp_deposer_codes
CREATE OR REPLACE FUNCTION private.grp_deposer_codes(p_client uuid, p_entite uuid, p_nature text, p_lignes jsonb, p_source text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lus integer;
  v_nouveaux integer;
  v_modifies integer;
  v_valides integer;
  v_rejetes jsonb;
  v_anomalies integer;
begin
  perform private.grp_exiger_installation(p_client);
  if p_nature is null or p_nature not in ('client', 'fournisseur', 'article', 'site') then
    raise exception 'Nature inconnue : % (client, fournisseur, article ou site).', coalesce(p_nature, 'vide') using errcode = '22023';
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se déposent en tableau JSON.' using errcode = '22023';
  end if;
  v_lus := jsonb_array_length(p_lignes);
  if v_lus > 20000 then
    raise exception 'Un dépôt porte 20 000 lignes au plus (%).', v_lus using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  perform pg_advisory_xact_lock(hashtextextended('varelo.referentiel:' || p_client::text, 0));
  with brut as (
    select x.n::integer as ligne, x.e as l,
           case when jsonb_typeof(x.e) = 'object' then nullif(btrim(x.e ->> 'code'), '') end as code,
           case when jsonb_typeof(x.e) = 'object' then nullif(btrim(coalesce(x.e ->> 'nom', x.e ->> 'designation')), '') end as nom
    from jsonb_array_elements(p_lignes) with ordinality as x(e, n)
  ),
  motifs as (
    select b.ligne, b.code,
      case
        when jsonb_typeof(b.l) <> 'object' then 'ligne illisible'
        when b.code is null then 'code local manquant'
        when char_length(b.code) > 80 then 'code local trop long (80 caractères au plus)'
        when b.nom is null then 'nom manquant'
        when char_length(b.nom) > 200 then 'nom trop long (200 caractères au plus)'
        when exists (select 1 from brut b2 where b2.code = b.code and b2.ligne > b.ligne) then 'doublon dans le lot'
      end as motif
    from brut b
  ),
  valides as (
    select b.* from brut b join motifs m on m.ligne = b.ligne where m.motif is null
  ),
  normalises as (
    select v.ligne, v.code, v.nom,
      case when p_nature = 'article' then private.grp_designation_normalisee(v.nom) else private.grp_nom_normalise(v.nom) end as nom_n,
      private.grp_siren_de(v.l ->> 'siren', v.l ->> 'siret', v.l ->> 'tva') as siren,
      private.grp_tva_normalisee(v.l ->> 'tva') as tva,
      coalesce(case when lower(v.l ->> 'iban_empreinte') ~ '^[0-9a-f]{64}$' then lower(v.l ->> 'iban_empreinte') end,
               private.grp_iban_empreinte(p_client, v.l ->> 'iban')) as iban_e,
      private.grp_gtin(v.l ->> 'gtin') as gtin,
      left(nullif(private.grp_texte_normalise(v.l ->> 'ref_fournisseur'), ''), 80) as ref_f,
      left(nullif(btrim(v.l ->> 'fournisseur'), ''), 80) as fourn,
      left(nullif(btrim(v.l ->> 'unite'), ''), 30) as unite,
      left(nullif(btrim(v.l ->> 'adresse'), ''), 300) as adresse,
      private.grp_code_postal(coalesce(v.l ->> 'code_postal', v.l ->> 'cp')) as cp,
      left(nullif(btrim(v.l ->> 'ville'), ''), 120) as ville,
      case when upper(btrim(v.l ->> 'pays')) ~ '^[A-Z]{2}$' then upper(btrim(v.l ->> 'pays')) end as pays,
      private.grp_telephone_cle(v.l ->> 'telephone') as tel,
      left(private.grp_domaine_email(v.l ->> 'email'), 120) as dom,
      left(nullif(btrim(v.l ->> 'type'), ''), 60) as type_site,
      coalesce(lower(btrim(v.l ->> 'actif')) not in ('false', '0', 'non', 'n', 'f', 'faux'), true) as actif,
      jsonb_strip_nulls(jsonb_build_object(
        'siren', case when nullif(btrim(v.l ->> 'siren'), '') is not null
                       and not coalesce(private.grp_siren_valide(regexp_replace(v.l ->> 'siren', '[\s.\-]', '', 'g')), false)
                      then 'clé ou format invalide' end,
        'siret', case when nullif(btrim(v.l ->> 'siret'), '') is not null
                       and not coalesce(private.grp_siret_valide(regexp_replace(v.l ->> 'siret', '[\s.\-]', '', 'g')), false)
                      then 'clé ou format invalide' end,
        'tva', case when nullif(btrim(v.l ->> 'tva'), '') is not null and private.grp_tva_normalisee(v.l ->> 'tva') is null
                    then 'clé ou format invalide' end,
        'iban', case when nullif(btrim(v.l ->> 'iban'), '') is not null and private.grp_iban_normalise(v.l ->> 'iban') is null
                     then 'clé invalide' end,
        'gtin', case when nullif(btrim(v.l ->> 'gtin'), '') is not null and private.grp_gtin(v.l ->> 'gtin') is null
                     then 'chiffre de contrôle faux' end,
        'code_postal', case when nullif(btrim(coalesce(v.l ->> 'code_postal', v.l ->> 'cp')), '') is not null
                             and private.grp_code_postal(coalesce(v.l ->> 'code_postal', v.l ->> 'cp')) is null
                            then 'illisible' end)) as anomalies
    from valides v
  ),
  prets as (
    select n.*,
      case when p_nature = 'article' then private.grp_designation_jetons(n.nom_n) else private.grp_nom_jetons(n.nom_n) end as jetons,
      private.grp_adresse_normalisee(n.adresse) as adr_n
    from normalises n
  ),
  finaux as (
    select p.*,
      nullif(left(p.jetons[1], case when p_nature = 'article' then 4 else 3 end), '') as bloc,
      encode(sha256(convert_to(jsonb_build_array(p.nom, p.nom_n, p.siren, p.tva, p.iban_e, p.gtin, p.ref_f, p.fourn, p.unite,
        p.adresse, p.cp, p.ville, p.pays, p.tel, p.dom, p.type_site, p.actif, p.anomalies)::text, 'UTF8')), 'hex') as empreinte
    from prets p
  ),
  ecrits as (
    insert into public.grp_ref_codes as g (client_id, entite_id, nature, code_local, nom_local, nom_normalise, jetons, bloc,
      siren, tva, iban_empreinte, gtin, ref_fournisseur, fournisseur_code, unite, adresse, adresse_normalisee, code_postal,
      ville, pays, telephone_cle, domaine_email, type_site, anomalies, empreinte, actif, source_ref, a_rapprocher, lu_le)
    select p_client, p_entite, p_nature, f.code, f.nom, f.nom_n, f.jetons, f.bloc, f.siren, f.tva, f.iban_e, f.gtin, f.ref_f,
           f.fourn, f.unite, f.adresse, f.adr_n, f.cp, f.ville, f.pays, f.tel, f.dom, f.type_site, f.anomalies, f.empreinte,
           f.actif, left(p_source, 200), true, now()
    from finaux f
    on conflict (client_id, entite_id, nature, code_local) do update set
      nom_local = excluded.nom_local, nom_normalise = excluded.nom_normalise, jetons = excluded.jetons, bloc = excluded.bloc,
      siren = excluded.siren, tva = excluded.tva, iban_empreinte = excluded.iban_empreinte, gtin = excluded.gtin,
      ref_fournisseur = excluded.ref_fournisseur, fournisseur_code = excluded.fournisseur_code, unite = excluded.unite,
      adresse = excluded.adresse, adresse_normalisee = excluded.adresse_normalisee, code_postal = excluded.code_postal,
      ville = excluded.ville, pays = excluded.pays, telephone_cle = excluded.telephone_cle, domaine_email = excluded.domaine_email,
      type_site = excluded.type_site, anomalies = excluded.anomalies, empreinte = excluded.empreinte, actif = excluded.actif,
      source_ref = excluded.source_ref, a_rapprocher = true, lu_le = now(), maj_le = now()
    where g.empreinte is distinct from excluded.empreinte
    returning (g.xmax = 0) as insere
  )
  select (select count(*) filter (where k.insere) from ecrits k),
         (select count(*) filter (where not k.insere) from ecrits k),
         (select count(*) from valides),
         (select coalesce(jsonb_agg(jsonb_build_object('ligne', m.ligne, 'code', m.code, 'motif', m.motif) order by m.ligne), '[]'::jsonb)
          from motifs m where m.motif is not null),
         (select count(*) from finaux f where f.anomalies <> '{}'::jsonb)
    into v_nouveaux, v_modifies, v_valides, v_rejetes, v_anomalies;
  if v_nouveaux + v_modifies > 0 then
    perform private.deposer_travail(p_client, 'varelo', 'varelo.referentiel.rapprocher', jsonb_build_object('complet', false),
                                    'rapprocher:' || p_client::text, 0::smallint);
  end if;
  perform private.grp_journal(p_client, 'varelo.referentiel.lecture', 'grp_societes', p_entite::text,
    jsonb_build_object('nature', p_nature, 'lus', v_lus, 'nouveaux', v_nouveaux, 'modifies', v_modifies,
                       'inchanges', v_valides - v_nouveaux - v_modifies, 'rejetes', jsonb_array_length(v_rejetes),
                       'anomalies', v_anomalies, 'source', left(p_source, 200)), p_entite);
  return jsonb_build_object('lus', v_lus, 'nouveaux', v_nouveaux, 'modifies', v_modifies,
                            'inchanges', v_valides - v_nouveaux - v_modifies, 'anomalies', v_anomalies, 'rejetes', v_rejetes);
end $function$


-- ═══ FONCTION private.grp_designation_jetons
CREATE OR REPLACE FUNCTION private.grp_designation_jetons(p_normalise text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(case when m ~ '^[0-9]+\.[0-9]+$' then rtrim(rtrim(m, '0'), '.') else m end order by i), '{}')
  from unnest(string_to_array(coalesce(p_normalise, ''), ' ')) with ordinality as t(m, i)
  where m <> '' and not (m = any (array['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'ET', 'AU', 'AUX', 'EN', 'POUR']))
$function$


-- ═══ FONCTION private.grp_designation_normalisee
CREATE OR REPLACE FUNCTION private.grp_designation_normalisee(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select replace(btrim(regexp_replace(
           regexp_replace(regexp_replace(regexp_replace(regexp_replace(
             upper(private.grp_sans_accents(coalesce(p, ''))),
             '([0-9])[,.]([0-9])', '\1#\2', 'g'),
             '[^A-Z0-9#]+', ' ', 'g'),
             '([0-9])([A-Z])', '\1 \2', 'g'),
             '([A-Z])([0-9])', '\1 \2', 'g'),
           '\s+', ' ', 'g')), '#', '.')
$function$


-- ═══ FONCTION private.grp_domaine_email
CREATE OR REPLACE FUNCTION private.grp_domaine_email(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when d ~ '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$'
                   and not (d = any (private.grp_domaines_publics())) then d end
  from (select lower(btrim(split_part(btrim(p), '@', 2))) as d where position('@' in coalesce(p, '')) > 0) x
$function$


-- ═══ FONCTION private.grp_domaines_publics
CREATE OR REPLACE FUNCTION private.grp_domaines_publics()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select array['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.com',
               'live.fr', 'msn.com', 'yahoo.com', 'yahoo.fr', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
               'orange.fr', 'wanadoo.fr', 'free.fr', 'sfr.fr', 'neuf.fr', 'laposte.net', 'bbox.fr', 'club-internet.fr',
               'numericable.fr', 'protonmail.com', 'proton.me', 'gmx.fr', 'gmx.com', 'mail.com', 'mediaserv.net',
               'outremer-telecom.fr', 'orange.mq', 'orange.gp', 'wanadoo.mq', 'wanadoo.gp', 'orange.re', 'sfr.re',
               'izi.re', 'zeop.re', 'canl.nc', 'mls.nc', 'lagoon.nc', 'mail.pf']
$function$


-- ═══ FONCTION private.grp_ecarter_proposition
CREATE OR REPLACE FUNCTION private.grp_ecarter_proposition(p_proposition uuid, p_motif text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  p public.grp_ref_propositions;
  d public.demandes_validation;
begin
  if v_uid is null then
    raise exception 'Une paire s''écarte par une personne connectée.' using errcode = '42501';
  end if;
  select * into p from public.grp_ref_propositions k where k.id = p_proposition for update;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = p.client_id) then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  if p.statut <> 'a_valider' then
    raise exception 'Cette proposition n''est plus à valider (%).', p.statut using errcode = '23514';
  end if;
  if p.preuve = 'humaine' then
    raise exception 'Une correction proposée par une personne se refuse par la décision de sa demande.' using errcode = '23514';
  end if;
  select * into d from public.demandes_validation k where k.id = p.demande_id for update;
  if not found or d.statut <> 'en_attente' then
    raise exception 'Le lot n''attend plus de décision.' using errcode = '23514';
  end if;
  perform private.exiger_decideur(d, v_uid);
  update public.grp_ref_propositions
     set statut = 'ecartee', motif = left(coalesce(nullif(btrim(p_motif), ''), 'Écartée par une décision.'), 500),
         decide_par = v_uid, traite_le = now()
   where id = p.id;
  if p.genre = 'placer' then
    perform private.grp_liberer_code(p.code_id, 'rejet', false);
  end if;
  perform private.grp_journal(p.client_id, 'varelo.referentiel.ecart', 'grp_ref_propositions', p.id::text,
    jsonb_build_object('demande', d.id, 'genre', p.genre));
  perform private.grp_ranger_demandes(p.client_id);
end $function$


-- ═══ FONCTION private.grp_empreinte_codes
CREATE OR REPLACE FUNCTION private.grp_empreinte_codes(p_cle text, p_codes uuid[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return encode(sha256(convert_to(p_cle || ':' || coalesce(
    (select string_agg(c.empreinte, ',' order by c.id) from public.grp_ref_codes c where c.id = any (p_codes)), ''), 'UTF8')), 'hex');
end $function$


-- ═══ FONCTION private.grp_executer_decisions
CREATE OR REPLACE FUNCTION private.grp_executer_decisions(p_client uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inst public.grp_installations;
  d record;
  p record;
  v_res text;
  v_app integer;
  v_per integer;
  n_dem integer := 0;
  n_app integer := 0;
  n_per integer := 0;
  n_ref integer := 0;
begin
  v_inst := private.grp_exiger_installation(p_client);
  perform set_config('omega.module', 'varelo', true);
  perform pg_advisory_xact_lock(hashtextextended('varelo.referentiel:' || p_client::text, 0));
  perform private.grp_ranger_demandes(p_client);
  for d in
    select dv.id, dv.statut from public.demandes_validation dv
    where dv.client_id = p_client and dv.module = 'varelo' and dv.type_action = any (private.grp_types_referentiel())
      and dv.statut in ('approuvee', 'rejetee', 'expiree')
      and exists (select 1 from public.grp_ref_propositions pr where pr.demande_id = dv.id and pr.statut = 'a_valider')
    order by dv.decide_le nulls last, dv.cree_le, dv.id
    for update of dv skip locked
  loop
    n_dem := n_dem + 1;
    v_app := 0;
    v_per := 0;
    for p in
      select pr.id, pr.genre, pr.code_id from public.grp_ref_propositions pr
      where pr.demande_id = d.id and pr.statut = 'a_valider' order by pr.cree_le, pr.id
    loop
      if d.statut = 'approuvee' then
        begin
          v_res := private.grp_appliquer_proposition(p.id, d.id, v_inst.iban_partage_max);
        exception when others then
          v_res := left('Refusé par la base : ' || sqlerrm, 480);
        end;
        if v_res = 'executee' then
          update public.grp_ref_propositions set statut = 'executee', traite_le = now() where id = p.id;
          v_app := v_app + 1;
        elsif v_res <> 'deja' then
          update public.grp_ref_propositions set statut = 'perimee', motif = v_res, traite_le = now() where id = p.id;
          if p.genre = 'placer' then
            perform private.grp_liberer_code(p.code_id, 'nouveau', true);
          end if;
          v_per := v_per + 1;
        end if;
      else
        update public.grp_ref_propositions
           set statut = case when d.statut = 'rejetee' then 'rejetee' else 'perimee' end,
               motif = case when d.statut = 'rejetee' then 'Refusée par une décision.' else 'La demande a expiré.' end,
               traite_le = now()
         where id = p.id;
        if p.genre = 'placer' then
          perform private.grp_liberer_code(p.code_id, case when d.statut = 'rejetee' then 'rejet' else 'nouveau' end,
                                           d.statut <> 'rejetee');
        end if;
        n_ref := n_ref + 1;
      end if;
    end loop;
    if d.statut = 'approuvee' then
      update public.demandes_validation
         set statut = case when v_app > 0 then 'executee' else 'echec_execution' end,
             motif_echec = case when v_app = 0 then 'Les faits ont changé depuis la proposition : rien n''a été appliqué.' end
       where id = d.id;
    end if;
    perform private.grp_journal(p_client, 'varelo.referentiel.execution', 'demandes_validation', d.id::text,
      jsonb_build_object('decision', d.statut, 'appliquees', v_app, 'perimees', v_per));
    n_app := n_app + v_app;
    n_per := n_per + v_per;
  end loop;
  return jsonb_build_object('demandes', n_dem, 'appliquees', n_app, 'perimees', n_per, 'refusees', n_ref);
end $function$


-- ═══ FONCTION private.grp_exiger_installation
CREATE OR REPLACE FUNCTION private.grp_exiger_installation(p_client uuid)
 RETURNS grp_installations
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.grp_installations;
begin
  select * into v from public.grp_installations where client_id = p_client;
  if not found then
    raise exception 'Varelo n''est pas installé pour cette organisation.' using errcode = 'P0002',
      hint = 'public.grp_installer(client) pose les directions, les règles et le battement.';
  end if;
  return v;
end $function$


-- ═══ FONCTION private.grp_former_lots
CREATE OR REPLACE FUNCTION private.grp_former_lots(p_client uuid, p_inst grp_installations)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  g record;
  v_ids uuid[];
  v_lot uuid;
  v_d uuid;
  v_n integer;
  v_nature text;
  i integer;
  n integer := 0;
begin
  for g in
    select pr.nature, pr.type_action, array_agg(pr.id order by pr.cree_le, pr.id) as ids
    from public.grp_ref_propositions pr
    where pr.client_id = p_client and pr.statut = 'a_valider' and pr.demande_id is null and pr.preuve <> 'humaine'
    group by pr.nature, pr.type_action
  loop
    v_nature := case g.nature when 'client' then 'clients' when 'fournisseur' then 'fournisseurs'
                              when 'article' then 'articles' else 'sites' end;
    i := 1;
    while i <= cardinality(g.ids) loop
      v_ids := g.ids[i : i + p_inst.taille_lot - 1];
      v_n := cardinality(v_ids);
      v_lot := gen_random_uuid();
      insert into public.demandes_validation (client_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
      values (p_client, 'varelo', g.type_action, 'grp_referentiel', v_lot::text,
              left(case g.type_action
                when 'rattacher_codes' then format('Référentiel : rattacher %s codes %s, un identifiant commun le prouve.', v_n, v_nature)
                when 'rapprocher_codes' then format('Référentiel : %s codes %s probablement identiques, à vérifier un à un.', v_n, v_nature)
                when 'rattacher_iban_different' then format('Référentiel : %s %s aux coordonnées bancaires différentes, à vérifier.', v_n, v_nature)
                else format('Référentiel : %s codes %s à détacher, deux identifiants se contredisent.', v_n, v_nature) end, 500),
              jsonb_build_object('lot', v_lot, 'nature', g.nature, 'propositions', to_jsonb(v_ids)),
              'varelo:' || g.type_action || ':' || v_lot::text)
      returning id into v_d;
      update public.grp_ref_propositions set demande_id = v_d where id = any (v_ids);
      n := n + 1;
      i := i + p_inst.taille_lot;
    end loop;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.grp_formes_juridiques
CREATE OR REPLACE FUNCTION private.grp_formes_juridiques()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select array['SARL', 'SAS', 'SASU', 'SA', 'EURL', 'SCI', 'SNC', 'SCS', 'SCA', 'SELARL', 'SELAS', 'SELASU',
               'SELAFA', 'SELCA', 'SELURL', 'SEL', 'SCP', 'SCM', 'SCOP', 'SCIC', 'SEM', 'SEML', 'SAEM', 'SPL',
               'GIE', 'GAEC', 'EARL', 'EI', 'EIRL', 'EPIC', 'SASP', 'SCEA', 'SICA', 'SE']
$function$


-- ═══ FONCTION private.grp_fournisseur_de
CREATE OR REPLACE FUNCTION private.grp_fournisseur_de(p_client uuid, p_entite uuid, p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_code is null then
    return null;
  end if;
  return (select f.objet_id from public.grp_ref_codes f
          where f.client_id = p_client and f.entite_id = p_entite and f.nature = 'fournisseur' and f.code_local = p_code);
end $function$


-- ═══ FONCTION private.grp_fusionner_objet
CREATE OR REPLACE FUNCTION private.grp_fusionner_objet(p_source uuid, p_cible uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.grp_ref_objets set statut = 'fusionne', fusionne_dans = p_cible where id = p_source and statut = 'actif';
  update public.grp_ref_objets set fusionne_dans = p_cible where fusionne_dans = p_source and id <> p_source;
  update public.grp_ref_propositions set statut = 'perimee', motif = 'L''objet a fusionné dans un autre.', traite_le = now()
   where statut = 'a_valider' and (objet_cible = p_source or objet_source = p_source);
end $function$


-- ═══ FONCTION private.grp_garder_code
CREATE OR REPLACE FUNCTION private.grp_garder_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_statut text;
  v_d record;
begin
  if new.objet_id is not null then
    select o.statut into v_statut from public.grp_ref_objets o where o.id = new.objet_id;
    if v_statut is distinct from 'actif' then
      raise exception 'Un code se rattache à un objet actif du référentiel.' using errcode = '23514';
    end if;
    if (new.siren is not null or new.gtin is not null) and exists (
         select 1 from public.grp_ref_codes y
         where y.objet_id = new.objet_id and y.id <> new.id
           and ((new.siren is not null and y.siren is not null and y.siren <> new.siren)
             or (new.gtin is not null and y.gtin is not null and y.gtin <> new.gtin))) then
      raise exception 'Un objet du référentiel ne porte qu''un SIREN et qu''un GTIN : ce code en apporte un autre.'
        using errcode = '23514';
    end if;
  end if;
  if new.etat = 'confirme' then
    select d.client_id, d.module, d.type_action, d.statut into v_d
    from public.demandes_validation d where d.id = new.demande_id;
    if not found or v_d.client_id <> new.client_id or v_d.module <> 'varelo'
       or not (v_d.type_action = any (private.grp_types_referentiel()))
       or v_d.statut not in ('approuvee', 'executee') then
      raise exception 'Un rattachement confirmé exige une demande approuvée.' using errcode = '42501';
    end if;
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.grp_garder_objet
CREATE OR REPLACE FUNCTION private.grp_garder_objet()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (new.client_id, new.nature, new.numero) is distinct from (old.client_id, old.nature, old.numero) then
    raise exception 'Le code du groupe ne change jamais.' using errcode = '42501';
  end if;
  if old.statut = 'fusionne' and new.statut = 'actif' then
    raise exception 'Une fusion ne se défait pas : on scinde l''objet qui l''a reçue.' using errcode = '23514';
  end if;
  if new.statut = 'fusionne' and old.statut = 'actif'
     and exists (select 1 from public.grp_ref_codes c where c.objet_id = new.id) then
    raise exception 'Un objet ne fusionne qu''une fois tous ses codes partis.' using errcode = '23514';
  end if;
  if new.fusionne_dans is distinct from old.fusionne_dans and new.fusionne_dans is not null
     and not exists (select 1 from public.grp_ref_objets o where o.id = new.fusionne_dans and o.statut = 'actif') then
    raise exception 'Un objet fusionne dans un objet actif.' using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION private.grp_gtin
CREATE OR REPLACE FUNCTION private.grp_gtin(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v text := regexp_replace(coalesce(p, ''), '[\s\-]', '', 'g');
  v_somme integer := 0;
  i integer;
begin
  if v !~ '^[0-9]+$' or length(v) not in (8, 12, 13, 14) or v ~ '^0+$' then
    return null;
  end if;
  v := lpad(v, 14, '0');
  for i in 1 .. 13 loop
    v_somme := v_somme + substr(v, i, 1)::integer * case when i % 2 = 1 then 3 else 1 end;
  end loop;
  if (10 - v_somme % 10) % 10 = substr(v, 14, 1)::integer then
    return v;
  end if;
  return null;
end $function$


-- ═══ FONCTION private.grp_iban_differents
CREATE OR REPLACE FUNCTION private.grp_iban_differents(p_a uuid, p_b uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return exists (select 1 from public.grp_ref_codes a where a.objet_id = p_a and a.iban_empreinte is not null)
     and exists (select 1 from public.grp_ref_codes b where b.objet_id = p_b and b.iban_empreinte is not null)
     and not exists (select 1 from public.grp_ref_codes a, public.grp_ref_codes b
                     where a.objet_id = p_a and b.objet_id = p_b and a.iban_empreinte = b.iban_empreinte);
end $function$


-- ═══ FONCTION private.grp_iban_empreinte
CREATE OR REPLACE FUNCTION private.grp_iban_empreinte(p_client uuid, p_iban text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when p_client is null or private.grp_iban_normalise(p_iban) is null then null
              else encode(sha256(convert_to(p_client::text || ':' || private.grp_iban_normalise(p_iban), 'UTF8')), 'hex') end
$function$


-- ═══ FONCTION private.grp_iban_normalise
CREATE OR REPLACE FUNCTION private.grp_iban_normalise(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v text := upper(regexp_replace(coalesce(p, ''), '[\s\-]', '', 'g'));
  v_tourne text;
  v_chiffres text := '';
  c text;
  i integer;
begin
  if v !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
    return null;
  end if;
  v_tourne := substr(v, 5) || substr(v, 1, 4);
  for i in 1 .. length(v_tourne) loop
    c := substr(v_tourne, i, 1);
    v_chiffres := v_chiffres || case when c ~ '[A-Z]' then (ascii(c) - 55)::text else c end;
  end loop;
  if mod(v_chiffres::numeric, 97) = 1 then
    return v;
  end if;
  return null;
end $function$


-- ═══ FONCTION private.grp_iban_partage
CREATE OR REPLACE FUNCTION private.grp_iban_partage(p_client uuid, p_empreinte text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return (select count(distinct coalesce(x.siren, x.nom_normalise))::integer
          from public.grp_ref_codes x
          where x.client_id = p_client and x.nature = 'fournisseur' and x.iban_empreinte = p_empreinte);
end $function$


-- ═══ FONCTION private.grp_installer
CREATE OR REPLACE FUNCTION private.grp_installer(p_client uuid, p_equipe_referent text DEFAULT 'referent_donnees'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_referent uuid;
  v_df uuid;
  r record;
  n_regles integer := 0;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  perform set_config('omega.module', 'varelo', true);
  insert into public.grp_installations (client_id, equipe_referent) values (p_client, coalesce(p_equipe_referent, 'referent_donnees'))
  on conflict (client_id) do nothing;
  insert into public.equipes (client_id, cle, nom)
  select p_client, v.cle, v.nom from (values
    ('presidence', 'Présidence'), ('direction_financiere', 'Direction financière'), ('direction_juridique', 'Direction juridique'),
    ('direction_operations', 'Direction des opérations'), ('dsi', 'DSI'), ('referent_donnees', 'Référent données')) as v(cle, nom)
  on conflict (client_id, cle) do nothing;
  select e.id into v_referent from public.equipes e
  where e.client_id = p_client and e.cle = (select i.equipe_referent from public.grp_installations i where i.client_id = p_client);
  if v_referent is null then
    raise exception 'Équipe du référent inconnue : %.', p_equipe_referent using errcode = '22023';
  end if;
  select e.id into v_df from public.equipes e where e.client_id = p_client and e.cle = 'direction_financiere';
  for r in
    select * from (values
      ('rattacher_codes', v_referent, 1), ('rapprocher_codes', v_referent, 1), ('fusionner_objets', v_referent, 1),
      ('detacher_code', v_referent, 1), ('scinder_objet', v_referent, 1), ('renommer_objet', v_referent, 1),
      ('rattacher_iban_different', v_df, 2)) as v(type_action, equipe_id, approbations)
  loop
    if not exists (select 1 from public.regles_validation g
                   where g.client_id = p_client and g.module = 'varelo' and g.type_action = r.type_action and g.entite_id is null) then
      insert into public.regles_validation (client_id, module, type_action, equipe_id, approbations_requises, roles_autorises)
      values (p_client, 'varelo', r.type_action, r.equipe_id, r.approbations::smallint, array['gerant', 'admin', 'valideur']);
      n_regles := n_regles + 1;
    end if;
  end loop;
  perform private.regler_battement(p_client, 'varelo_referentiel', interval '1 day', null, 'Europe/Paris');
  perform private.grp_journal(p_client, 'varelo.installation', 'clients', p_client::text,
    jsonb_build_object('moteur', 'referentiel', 'regles_posees', n_regles));
  return jsonb_build_object('installe', true, 'regles_posees', n_regles);
end $function$


-- ═══ FONCTION private.grp_jaccard
CREATE OR REPLACE FUNCTION private.grp_jaccard(ta text[], tb text[])
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
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
end $function$


-- ═══ FONCTION private.grp_journal
CREATE OR REPLACE FUNCTION private.grp_journal(p_client uuid, p_action text, p_objet_type text, p_objet_id text, p_donnees jsonb DEFAULT '{}'::jsonb, p_entite uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v bigint;
begin
  v := private.journaliser_module(p_client, 'varelo', p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', 'varelo', true);
  return v;
end $function$


-- ═══ FONCTION private.grp_liberer_code
CREATE OR REPLACE FUNCTION private.grp_liberer_code(p_code uuid, p_methode text, p_reexaminer boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.grp_ref_codes;
  v_obj uuid;
begin
  select * into c from public.grp_ref_codes k where k.id = p_code for update;
  if not found or c.etat <> 'propose' then
    return c.objet_id;
  end if;
  v_obj := private.grp_creer_objet(c.client_id, c.nature, c.nom_local);
  update public.grp_ref_codes
     set objet_id = v_obj, etat = 'nouveau', methode = p_methode, score = null, demande_id = null, rattache_le = now(),
         a_rapprocher = p_reexaminer
   where id = p_code;
  return v_obj;
end $function$


-- ═══ FONCTION private.grp_luhn
CREATE OR REPLACE FUNCTION private.grp_luhn(p text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v_somme integer := 0;
  v_chiffre integer;
  v_n integer;
  i integer;
begin
  if p is null or p !~ '^[0-9]+$' then
    return false;
  end if;
  v_n := length(p);
  for i in 1 .. v_n loop
    v_chiffre := substr(p, v_n - i + 1, 1)::integer;
    if i % 2 = 0 then
      v_chiffre := v_chiffre * 2;
      if v_chiffre > 9 then
        v_chiffre := v_chiffre - 9;
      end if;
    end if;
    v_somme := v_somme + v_chiffre;
  end loop;
  return v_somme % 10 = 0;
end $function$


-- ═══ FONCTION private.grp_marquer_intragroupe
CREATE OR REPLACE FUNCTION private.grp_marquer_intragroupe(p_client uuid, p_objets uuid[] DEFAULT NULL::uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  n integer;
begin
  update public.grp_ref_objets o
     set intragroupe = (x.entite is not null), intragroupe_entite_id = x.entite
    from (
      select o2.id,
             (select e.id from public.grp_ref_codes c
              join public.entites e on e.client_id = c.client_id and e.siren = c.siren and e.type = 'societe'
              where c.objet_id = o2.id and c.siren is not null and c.etat in ('nouveau', 'confirme', 'propose')
              order by e.principale desc, e.nom limit 1) as entite
      from public.grp_ref_objets o2
      where o2.client_id = p_client and o2.statut = 'actif' and o2.nature in ('client', 'fournisseur')
        and (p_objets is null or o2.id = any (p_objets))
    ) x
   where o.id = x.id and (o.intragroupe is distinct from (x.entite is not null) or o.intragroupe_entite_id is distinct from x.entite);
  get diagnostics n = row_count;
  return n;
end $function$


-- ═══ FONCTION private.grp_mots_generiques
CREATE OR REPLACE FUNCTION private.grp_mots_generiques()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select array['STE', 'SOCIETE', 'ETS', 'ETABLISSEMENT', 'ETABLISSEMENTS', 'CIE']
$function$


-- ═══ FONCTION private.grp_mots_vides
CREATE OR REPLACE FUNCTION private.grp_mots_vides()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select array['DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'L', 'D', 'ET', 'A', 'AU', 'AUX', 'EN', 'SUR', 'SOUS',
               'PAR', 'POUR', 'CHEZ', 'THE', 'OF', 'AND']
$function$


-- ═══ FONCTION private.grp_nom_affichage
CREATE OR REPLACE FUNCTION private.grp_nom_affichage(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v text;
begin
  if p is null or btrim(p) = '' then
    return null;
  end if;
  select string_agg(m, ' ' order by i) into v
  from unnest(regexp_split_to_array(btrim(p), '\s+')) with ordinality as t(m, i)
  where not (private.grp_texte_normalise(m) = any (private.grp_formes_juridiques()));
  v := btrim(coalesce(v, ''), ' -,;:/');
  if v = '' then
    v := btrim(p);
  end if;
  if private.grp_sans_accents(v) !~ '[a-z]' then
    select string_agg(
             case
               when i > 1 and lower(w) = any (array['de', 'du', 'des', 'la', 'le', 'les', 'et', 'au', 'aux', 'en', 'sur', 'sous', 'à'])
                 then lower(w)
               when w ~ '^[LlDd]''.' then
                 case when i > 1 then lower(left(w, 1)) else upper(left(w, 1)) end || '''' || upper(substr(w, 3, 1)) || substr(w, 4)
               else w
             end, ' ' order by i) into v
    from unnest(regexp_split_to_array(initcap(v), '\s+')) with ordinality as t(w, i);
  end if;
  return left(v, 200);
end $function$


-- ═══ FONCTION private.grp_nom_jetons
CREATE OR REPLACE FUNCTION private.grp_nom_jetons(p_normalise text)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(m order by i), '{}')
  from unnest(string_to_array(coalesce(p_normalise, ''), ' ')) with ordinality as t(m, i)
  where m <> '' and not (m = any (private.grp_mots_vides())) and not (m = any (private.grp_mots_generiques()))
$function$


-- ═══ FONCTION private.grp_nom_normalise
CREATE OR REPLACE FUNCTION private.grp_nom_normalise(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when p is null then null else
    coalesce((select string_agg(m, ' ' order by i)
              from unnest(string_to_array(private.grp_texte_normalise(p), ' ')) with ordinality as t(m, i)
              where m <> '' and not (m = any (private.grp_formes_juridiques()))), '')
  end
$function$


-- ═══ FONCTION private.grp_noter_export
CREATE OR REPLACE FUNCTION private.grp_noter_export(p_client uuid, p_nature text, p_lignes integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''export du référentiel revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  perform private.grp_journal(p_client, 'varelo.referentiel.export', 'grp_referentiel', p_nature,
    jsonb_build_object('nature', p_nature, 'lignes', p_lignes, 'format', 'csv'));
end $function$


-- ═══ FONCTION private.grp_objets_compatibles
CREATE OR REPLACE FUNCTION private.grp_objets_compatibles(p_a uuid, p_b uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$


-- ═══ FONCTION private.grp_perimetre_total
CREATE OR REPLACE FUNCTION private.grp_perimetre_total(p_client uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((select c.perimetre_total from public.comptes c
                   where c.user_id = (select auth.uid()) and c.client_id = p_client), false)
$function$


-- ═══ FONCTION private.grp_placer_nouveaux
CREATE OR REPLACE FUNCTION private.grp_placer_nouveaux(p_client uuid, p_inst grp_installations)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  b record;
  v_obj uuid;
  v_type text;
  v_cle text;
  n_crees integer := 0;
  n_places integer := 0;
begin
  for c in
    select x.id, x.nature, x.nom_local, x.iban_empreinte
    from public.grp_ref_codes x join public.entites e on e.client_id = x.client_id and e.id = x.entite_id
    where x.client_id = p_client and x.etat = 'a_traiter'
    order by case x.nature when 'fournisseur' then 1 when 'client' then 2 when 'site' then 3 else 4 end,
             (x.siren is null), (x.gtin is null), (x.adresse_normalisee is null), char_length(x.nom_normalise) desc,
             e.nom, x.code_local
  loop
    select * into b from private.grp_preuves_sures(c.id, p_inst.iban_partage_max) limit 1;
    if found then
      v_type := case when c.nature = 'fournisseur' and c.iban_empreinte is not null
                      and exists (select 1 from public.grp_ref_codes y where y.objet_id = b.objet_id and y.iban_empreinte is not null)
                      and not exists (select 1 from public.grp_ref_codes y where y.objet_id = b.objet_id
                                      and y.iban_empreinte = c.iban_empreinte)
                     then 'rattacher_iban_different' else 'rattacher_codes' end;
      update public.grp_ref_codes
         set objet_id = b.objet_id, etat = 'propose', methode = b.regle, score = 1, rattache_le = now(), a_rapprocher = false
       where id = c.id;
      v_cle := 'c:' || c.id::text || '>' || b.objet_id::text;
      insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, objet_cible, regle, score,
                                               raisons, preuves, cle_paire, empreinte)
      values (p_client, c.nature, 'placer', 'sure', v_type, c.id, b.objet_id, b.regle, 1,
              jsonb_build_array(jsonb_build_object('critere', b.regle, 'valeur', b.valeur)),
              b.preuves, v_cle, private.grp_empreinte_codes(v_cle, array[c.id]));
      n_places := n_places + 1;
    else
      v_obj := private.grp_creer_objet(p_client, c.nature, c.nom_local);
      update public.grp_ref_codes set objet_id = v_obj, etat = 'nouveau', methode = 'nouveau', score = null, rattache_le = now()
       where id = c.id;
      n_crees := n_crees + 1;
    end if;
  end loop;
  return jsonb_build_object('objets_crees', n_crees, 'places_d_office', n_places);
end $function$


-- ═══ FONCTION private.grp_planifier_referentiel
CREATE OR REPLACE FUNCTION private.grp_planifier_referentiel(p_complet boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i record;
  n integer := 0;
begin
  for i in select g.client_id from public.grp_installations g loop
    perform private.deposer_travail(i.client_id, 'varelo', 'varelo.referentiel.rapprocher', jsonb_build_object('complet', p_complet),
      'rapprocher' || case when p_complet then '-complet' else '' end || ':' || i.client_id::text, 0::smallint);
    n := n + 1;
  end loop;
  perform private.grp_controler_societes();
  return n;
end $function$


-- ═══ FONCTION private.grp_preuve_tient
CREATE OR REPLACE FUNCTION private.grp_preuve_tient(p_code uuid, p_objet uuid, p_regle text, p_preuves uuid[], p_iban_max integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.grp_ref_codes;
begin
  select * into c from public.grp_ref_codes k where k.id = p_code;
  if not found then
    return false;
  end if;
  return exists (
    select 1 from public.grp_ref_codes x
    where x.id = any (p_preuves) and x.id <> c.id and x.objet_id = p_objet and x.etat in ('nouveau', 'confirme') and x.actif
      and case p_regle
        when 'siren' then c.siren is not null and x.siren = c.siren
        when 'tva' then c.tva is not null and x.tva = c.tva
        when 'iban' then c.iban_empreinte is not null and x.iban_empreinte = c.iban_empreinte
                         and private.grp_iban_partage(c.client_id, c.iban_empreinte) <= p_iban_max
        when 'gtin' then c.gtin is not null and x.gtin = c.gtin
        when 'ref_fournisseur' then c.ref_fournisseur is not null and x.ref_fournisseur = c.ref_fournisseur
                         and private.grp_fournisseur_de(c.client_id, c.entite_id, c.fournisseur_code)
                             = private.grp_fournisseur_de(x.client_id, x.entite_id, x.fournisseur_code)
        when 'nom_cp' then c.code_postal is not null and x.nom_normalise = c.nom_normalise and x.code_postal = c.code_postal
        else false end);
end $function$


-- ═══ FONCTION private.grp_preuves_sures
CREATE OR REPLACE FUNCTION private.grp_preuves_sures(p_code uuid, p_iban_max integer)
 RETURNS TABLE(objet_id uuid, rang integer, regle text, valeur text, preuves uuid[], nb bigint, numero integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare
  c public.grp_ref_codes;
  v_iban_ok boolean;
  v_fourn uuid;
begin
  select * into c from public.grp_ref_codes k where k.id = p_code;
  if not found or not c.actif then
    return;
  end if;
  v_iban_ok := c.nature = 'fournisseur' and c.iban_empreinte is not null
               and private.grp_iban_partage(c.client_id, c.iban_empreinte) <= p_iban_max;
  v_fourn := case when c.nature = 'article' then private.grp_fournisseur_de(c.client_id, c.entite_id, c.fournisseur_code) end;
  return query
  with cand as (
    select x.id as x_id, x.objet_id as x_obj,
      case
        when c.siren is not null and x.siren = c.siren then 1
        when c.tva is not null and x.tva = c.tva and (c.siren is null or x.siren is null) then 2
        when v_iban_ok and x.iban_empreinte = c.iban_empreinte
             and not (c.siren is not null and x.siren is not null and c.siren <> x.siren) then 3
        when c.nature = 'article' and c.gtin is not null and x.gtin = c.gtin then 4
        when c.nature = 'article' and c.ref_fournisseur is not null and x.ref_fournisseur = c.ref_fournisseur
             and v_fourn is not null and private.grp_fournisseur_de(x.client_id, x.entite_id, x.fournisseur_code) = v_fourn
             and not (c.gtin is not null and x.gtin is not null and c.gtin <> x.gtin) then 5
        when c.nature <> 'article' and char_length(c.nom_normalise) >= 2 and x.nom_normalise = c.nom_normalise
             and c.code_postal is not null and x.code_postal = c.code_postal
             and not (c.siren is not null and x.siren is not null and c.siren <> x.siren)
             and not (c.tva is not null and x.tva is not null and c.tva <> x.tva) then 6
      end as r
    from public.grp_ref_codes x
    where x.client_id = c.client_id and x.nature = c.nature and x.id <> c.id and x.actif
      and x.etat in ('nouveau', 'confirme') and x.objet_id is distinct from c.objet_id
      and (x.siren = c.siren or x.tva = c.tva or x.iban_empreinte = c.iban_empreinte or x.gtin = c.gtin
           or x.ref_fournisseur = c.ref_fournisseur or (x.nom_normalise = c.nom_normalise and x.code_postal = c.code_postal))
  ),
  par_objet as (
    select k.x_obj, min(k.r) as r from cand k where k.r is not null group by k.x_obj
  )
  select p.x_obj, p.r,
         (array['siren', 'tva', 'iban', 'gtin', 'ref_fournisseur', 'nom_cp'])[p.r],
         case p.r when 1 then c.siren when 2 then c.tva when 3 then 'même IBAN' when 4 then c.gtin
                  when 5 then c.ref_fournisseur else c.nom_normalise || ' · ' || c.code_postal end,
         (select array_agg(k.x_id order by k.x_id) from cand k where k.x_obj = p.x_obj and k.r = p.r),
         (select count(*) from public.grp_ref_codes y where y.objet_id = p.x_obj),
         o.numero
  from par_objet p
  join public.grp_ref_objets o on o.id = p.x_obj and o.statut = 'actif'
  where private.grp_code_compatible(c.id, p.x_obj)
  order by 6 desc, 7 asc;
end $function$


-- ═══ FONCTION private.grp_proposer
CREATE OR REPLACE FUNCTION private.grp_proposer(p_genre text, p_code uuid, p_codes uuid[], p_source uuid, p_cible uuid, p_nom text, p_raison text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.grp_ref_codes;
  o public.grp_ref_objets;
  oc public.grp_ref_objets;
  v_client uuid;
  v_nature text;
  v_entite uuid;
  v_source uuid := p_source;
  v_cible uuid := p_cible;
  v_bougent uuid[] := '{}';
  v_type text;
  v_cle text;
  v_prop uuid;
  v_d uuid;
  v_resume text;
begin
  if v_uid is null then
    raise exception 'Une correction du référentiel est proposée par une personne connectée.' using errcode = '42501';
  end if;
  if p_genre in ('deplacer', 'detacher') then
    select * into c from public.grp_ref_codes k where k.id = p_code;
    if not found then
      raise exception 'Code introuvable.' using errcode = 'P0002';
    end if;
    v_client := c.client_id;
    v_nature := c.nature;
    v_entite := c.entite_id;
    v_bougent := array[c.id];
    if p_genre = 'detacher' then v_cible := c.objet_id; else v_source := c.objet_id; end if;
  else
    select * into o from public.grp_ref_objets k where k.id = coalesce(v_source, v_cible);
    if not found then
      raise exception 'Objet introuvable.' using errcode = 'P0002';
    end if;
    v_client := o.client_id;
    v_nature := o.nature;
    if p_genre = 'fusionner' then
      select coalesce(array_agg(y.id), '{}') into v_bougent from public.grp_ref_codes y where y.objet_id = v_source;
    elsif p_genre = 'scinder' then
      v_bougent := coalesce(p_codes, '{}');
    end if;
  end if;
  if not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = v_client
                 and k.role in ('gerant', 'admin', 'valideur', 'collaborateur')) then
    raise exception 'Seul un membre qui agit (gérant, administrateur, valideur, collaborateur) propose une correction.'
      using errcode = '42501';
  end if;
  if exists (select 1 from public.grp_ref_codes y where y.id = any (v_bougent)
             and not private.voit_entite(y.client_id, y.entite_id)) then
    raise exception 'Un des codes concernés est hors de votre périmètre.' using errcode = '42501';
  end if;
  select * into oc from public.grp_ref_objets k where k.id = v_cible and k.client_id = v_client and k.nature = v_nature;
  if not found or oc.statut <> 'actif' then
    raise exception 'L''objet d''arrivée n''est pas un objet actif du même référentiel.' using errcode = '23514';
  end if;
  if p_genre = 'deplacer' then
    if c.etat not in ('nouveau', 'confirme') then
      raise exception 'Ce code attend déjà la validation de son rattachement.' using errcode = '23514';
    end if;
    if c.objet_id = v_cible then
      raise exception 'Ce code est déjà rattaché à cet objet.' using errcode = '23514';
    end if;
    if not private.grp_code_compatible(c.id, v_cible) then
      raise exception 'Deux identifiants se contredisent (SIREN, TVA ou GTIN) : ce code n''entre pas dans cet objet.' using errcode = '23514';
    end if;
  elsif p_genre = 'fusionner' then
    if v_source = v_cible or o.statut <> 'actif' then
      raise exception 'On fusionne deux objets actifs et distincts.' using errcode = '23514';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.objet_id = v_source and y.etat = 'propose') then
      raise exception 'L''objet a des rattachements qui attendent leur validation.' using errcode = '23514';
    end if;
    if not private.grp_objets_compatibles(v_source, v_cible) then
      raise exception 'Deux identifiants se contredisent (SIREN, TVA ou GTIN) : ces objets ne fusionnent pas.' using errcode = '23514';
    end if;
  elsif p_genre = 'detacher' then
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = v_cible and y.id <> c.id) then
      raise exception 'On ne détache pas le dernier code d''un objet.' using errcode = '23514';
    end if;
  elsif p_genre = 'scinder' then
    if cardinality(v_bougent) = 0
       or exists (select 1 from unnest(v_bougent) as k(id) left join public.grp_ref_codes y on y.id = k.id
                  where y.objet_id is distinct from v_cible) then
      raise exception 'Les codes à scinder appartiennent à l''objet.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = v_cible and not (y.id = any (v_bougent))) then
      raise exception 'Une scission laisse au moins un code à l''objet.' using errcode = '23514';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.id = any (v_bougent) and y.etat = 'propose') then
      raise exception 'Un des codes attend encore sa validation.' using errcode = '23514';
    end if;
  elsif p_genre = 'renommer' then
    if nullif(btrim(p_nom), '') is null or char_length(btrim(p_nom)) > 200 then
      raise exception 'Un nom du groupe tient en 1 à 200 caractères.' using errcode = '22023';
    end if;
  else
    raise exception 'Correction inconnue : %.', coalesce(p_genre, 'vide') using errcode = '22023';
  end if;
  if exists (select 1 from public.grp_ref_propositions q
             where q.client_id = v_client and q.statut = 'a_valider'
               and ((q.code_id is not null and q.code_id = any (v_bougent))
                 or (q.genre = 'fusionner' and q.objet_source = v_source))) then
    raise exception 'Une proposition attend déjà une décision pour ce code ou cet objet.' using errcode = '23514';
  end if;
  v_type := case p_genre when 'detacher' then 'detacher_code' when 'scinder' then 'scinder_objet'
                         when 'renommer' then 'renommer_objet' else 'fusionner_objets' end;
  if p_genre in ('deplacer', 'fusionner') and v_nature = 'fournisseur' and private.grp_iban_differents(v_source, v_cible) then
    v_type := 'rattacher_iban_different';
  end if;
  v_cle := case p_genre
    when 'deplacer' then 'c:' || c.id::text || '>' || v_cible::text
    when 'fusionner' then 'o:' || least(v_source, v_cible)::text || '|' || greatest(v_source, v_cible)::text
    when 'detacher' then 'd:' || c.id::text || '<' || v_cible::text
    when 'scinder' then 's:' || v_cible::text
    else 'n:' || v_cible::text end;
  insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, codes, objet_source, objet_cible,
                                           nom, regle, raisons, cle_paire, empreinte)
  values (v_client, v_nature, p_genre, 'humaine', v_type, case when p_genre in ('deplacer', 'detacher') then c.id end,
          case when p_genre = 'scinder' then v_bougent end, case when p_genre in ('deplacer', 'fusionner') then v_source end,
          v_cible, case when p_genre = 'renommer' then btrim(p_nom) end, 'humain',
          jsonb_build_array(jsonb_build_object('critere', 'humain', 'raison', left(coalesce(p_raison, ''), 500))),
          v_cle, private.grp_empreinte_codes(v_cle, v_bougent))
  returning id into v_prop;
  v_resume := case p_genre
    when 'deplacer' then format('Référentiel : rattacher un code de la société à %s.', oc.code_groupe)
    when 'fusionner' then format('Référentiel : fusionner %s dans %s.', o.code_groupe, oc.code_groupe)
    when 'detacher' then format('Référentiel : détacher un code de %s.', oc.code_groupe)
    when 'scinder' then format('Référentiel : scinder %s, %s code(s) sous un nouveau code du groupe.', oc.code_groupe, cardinality(v_bougent))
    else format('Référentiel : renommer %s.', oc.code_groupe) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
  values (v_client, case when p_genre in ('deplacer', 'detacher') then v_entite end, 'varelo', v_type, 'grp_referentiel', v_prop::text,
          v_resume, jsonb_build_object('proposition', v_prop, 'genre', p_genre, 'raison', left(coalesce(p_raison, ''), 500)),
          'varelo:' || v_type || ':' || v_prop::text)
  returning id into v_d;
  update public.grp_ref_propositions set demande_id = v_d where id = v_prop;
  return v_d;
end $function$


-- ═══ FONCTION private.grp_proposer_aretes
CREATE OR REPLACE FUNCTION private.grp_proposer_aretes(p_client uuid, p_inst grp_installations, p_complet boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    candidats as materialized (
      select distinct ke.id as e_id, kx.id as x_id
      from cles_utiles ke
      join e on e.id = ke.id
      join cles_utiles kx on kx.nature = ke.nature and kx.cle = ke.cle and kx.objet_id <> ke.objet_id
      where not exists (select 1 from e e2 where e2.id = kx.id and kx.id < ke.id)
    ),
    sures as materialized (
      select e.id as c_id, e.objet_id as c_obj, b.objet_id as x_obj, b.preuves, 'sure'::text as preuve, b.regle,
             1.000::numeric as score, jsonb_build_array(jsonb_build_object('critere', b.regle, 'valeur', b.valeur)) as raisons
      from e cross join lateral private.grp_preuves_sures(e.id, p_inst.iban_partage_max) b
    ),
    paires as materialized (
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
    probables as materialized (
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
    aretes as materialized (
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
end $function$


-- ═══ FONCTION private.grp_proposer_detachements
CREATE OR REPLACE FUNCTION private.grp_proposer_detachements(p_client uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_cle text;
  v_empreinte text;
  n integer := 0;
begin
  for r in
    with ids as (
      select c.objet_id, c.id, c.siren as v, 'siren'::text as k, c.cree_le from public.grp_ref_codes c
      where c.client_id = p_client and c.siren is not null and c.etat in ('nouveau', 'confirme')
      union all
      select c.objet_id, c.id, c.gtin, 'gtin', c.cree_le from public.grp_ref_codes c
      where c.client_id = p_client and c.gtin is not null and c.etat in ('nouveau', 'confirme')
    ),
    conflits as (
      select i.objet_id, i.k from ids i group by i.objet_id, i.k having count(distinct i.v) > 1
    ),
    comptes as (
      select i.objet_id, i.k, i.v, count(*) as n, min(i.cree_le) as premier
      from ids i join conflits f on f.objet_id = i.objet_id and f.k = i.k
      group by i.objet_id, i.k, i.v
    ),
    majorite as (
      select distinct on (m.objet_id, m.k) m.objet_id, m.k, m.v from comptes m order by m.objet_id, m.k, m.n desc, m.premier
    )
    select i.id, i.objet_id, i.k, i.v, m.v as v_objet, o.nature
    from ids i
    join majorite m on m.objet_id = i.objet_id and m.k = i.k and m.v <> i.v
    join public.grp_ref_objets o on o.id = i.objet_id
  loop
    continue when exists (select 1 from public.grp_ref_propositions q where q.code_id = r.id and q.statut = 'a_valider');
    v_cle := 'd:' || r.id::text || '<' || r.objet_id::text;
    v_empreinte := private.grp_empreinte_codes(v_cle, array[r.id]);
    continue when exists (select 1 from public.grp_ref_propositions q where q.client_id = p_client and q.cle_paire = v_cle
                          and q.empreinte = v_empreinte and q.statut in ('rejetee', 'ecartee'));
    insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, objet_cible, regle, score,
                                             raisons, cle_paire, empreinte)
    values (p_client, r.nature, 'detacher', 'sure', 'detacher_code', r.id, r.objet_id, r.k, 1,
            jsonb_build_array(jsonb_build_object('critere', r.k, 'valeur', r.v, 'valeur_objet', r.v_objet, 'egal', false)),
            v_cle, v_empreinte);
    n := n + 1;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.grp_ranger_demandes
CREATE OR REPLACE FUNCTION private.grp_ranger_demandes(p_client uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  n integer;
  p record;
begin
  update public.demandes_validation d set statut = 'annulee'
  where d.client_id = p_client and d.module = 'varelo' and d.statut = 'en_attente'
    and d.type_action = any (private.grp_types_referentiel())
    and exists (select 1 from public.grp_ref_propositions q where q.demande_id = d.id)
    and not exists (select 1 from public.grp_ref_propositions q where q.demande_id = d.id and q.statut = 'a_valider');
  get diagnostics n = row_count;
  for p in
    select q.id, q.genre, q.code_id from public.grp_ref_propositions q
    join public.demandes_validation d on d.id = q.demande_id
    where q.client_id = p_client and q.statut = 'a_valider' and d.statut = 'annulee'
  loop
    update public.grp_ref_propositions set statut = 'perimee', motif = 'La demande a été annulée.', traite_le = now() where id = p.id;
    if p.genre = 'placer' then
      perform private.grp_liberer_code(p.code_id, 'nouveau', true);
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.grp_rapprocher
CREATE OR REPLACE FUNCTION private.grp_rapprocher(p_client uuid, p_complet boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_inst public.grp_installations;
  v_debut timestamptz := clock_timestamp();
  v_codes integer;
  v_places jsonb;
  v_revus integer;
  v_detach integer;
  v_aretes jsonb;
  v_lots integer;
  v_exec jsonb;
  v_resultat jsonb;
begin
  v_inst := private.grp_exiger_installation(p_client);
  perform set_config('omega.module', 'varelo', true);
  perform pg_advisory_xact_lock(hashtextextended('varelo.referentiel:' || p_client::text, 0));
  select count(*) into v_codes from public.grp_ref_codes
  where client_id = p_client and (etat = 'a_traiter' or a_rapprocher or p_complet);
  v_places := private.grp_placer_nouveaux(p_client, v_inst);
  v_revus := private.grp_revoir_provisoires(p_client, v_inst);
  v_detach := private.grp_proposer_detachements(p_client);
  v_aretes := private.grp_proposer_aretes(p_client, v_inst, p_complet);
  update public.grp_ref_codes set a_rapprocher = false where client_id = p_client and a_rapprocher;
  perform private.grp_marquer_intragroupe(p_client, null);
  v_lots := private.grp_former_lots(p_client, v_inst);
  v_exec := private.grp_executer_decisions(p_client);
  v_resultat := jsonb_build_object('codes_examines', v_codes, 'complet', p_complet) || v_places || v_aretes
    || jsonb_build_object('provisoires_revus', v_revus, 'detachements_proposes', v_detach, 'demandes', v_lots,
                          'execution', v_exec, 'duree_ms', round(extract(epoch from clock_timestamp() - v_debut) * 1000));
  perform private.grp_journal(p_client, 'varelo.referentiel.calcul', 'grp_referentiel', null, v_resultat);
  perform private.battre(p_client, 'varelo_referentiel', v_resultat, null);
  return v_resultat;
end $function$


-- ═══ FONCTION private.grp_renommer_auto
CREATE OR REPLACE FUNCTION private.grp_renommer_auto(p_objet uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_nom text;
begin
  if p_objet is null then
    return;
  end if;
  select private.grp_nom_affichage(c.nom_local) into v_nom
  from public.grp_ref_codes c
  where c.objet_id = p_objet and c.etat in ('nouveau', 'confirme')
  order by (private.grp_nom_affichage(c.nom_local) ~ '(^|\s)[[:alpha:]]{1,5}\.(\s|$)|(^|\s)[[:alpha:]]\.?(\s|$)'),
           (private.grp_sans_accents(c.nom_local) ~ '[a-z]') desc,
           char_length(c.nom_normalise) desc, c.cree_le, c.id
  limit 1;
  if v_nom is not null then
    update public.grp_ref_objets set nom_groupe = v_nom
    where id = p_objet and nom_origine = 'auto' and statut = 'actif' and nom_groupe is distinct from v_nom;
  end if;
end $function$


-- ═══ FONCTION private.grp_ressemblance_mots
CREATE OR REPLACE FUNCTION private.grp_ressemblance_mots(x text, y text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v_court text;
  v_long text;
  v_t numeric;
begin
  if x = y then
    return 1;
  end if;
  if x ~ '^[0-9.]+$' or y ~ '^[0-9.]+$' then
    return 0;
  end if;
  if length(x) <= length(y) then
    v_court := x; v_long := y;
  else
    v_court := y; v_long := x;
  end if;
  if length(v_court) = 1 then
    return case when left(v_long, 1) = v_court then 0.6 else 0 end;
  end if;
  if length(v_court) >= 3 and left(v_long, length(v_court)) = v_court then
    return 0.9;
  end if;
  v_t := private.grp_similarite_trigrammes(x, y);
  if v_t >= 0.5 then
    return round(0.9 * v_t, 3);
  end if;
  return 0;
end $function$


-- ═══ FONCTION private.grp_revoir_provisoires
CREATE OR REPLACE FUNCTION private.grp_revoir_provisoires(p_client uuid, p_inst grp_installations)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p record;
  n integer := 0;
begin
  for p in
    select pr.id, pr.code_id, pr.objet_cible, pr.regle, pr.preuves
    from public.grp_ref_propositions pr join public.grp_ref_codes c on c.id = pr.code_id
    where pr.client_id = p_client and pr.statut = 'a_valider' and pr.genre = 'placer' and c.etat = 'propose' and c.a_rapprocher
  loop
    if not private.grp_preuve_tient(p.code_id, p.objet_cible, p.regle, p.preuves, p_inst.iban_partage_max) then
      update public.grp_ref_propositions set statut = 'perimee', motif = 'La preuve ne tient plus : le code a changé.', traite_le = now()
       where id = p.id;
      perform private.grp_liberer_code(p.code_id, 'nouveau', true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$


-- ═══ FONCTION private.grp_sans_accents
CREATE OR REPLACE FUNCTION private.grp_sans_accents(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select replace(replace(replace(replace(replace(replace(translate(p,
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿŸ',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyyY'),
    'Œ', 'OE'), 'œ', 'oe'), 'Æ', 'AE'), 'æ', 'ae'), 'ß', 'ss'), 'ẞ', 'SS')
$function$


-- ═══ FONCTION private.grp_score_article
CREATE OR REPLACE FUNCTION private.grp_score_article(p_jetons_a text[], p_jetons_b text[], p_unite_a text, p_unite_b text, p_fourn_a uuid, p_fourn_b uuid, OUT score numeric, OUT raisons jsonb)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v_nom numeric;
  v_na text[];
  v_nb text[];
  s numeric;
begin
  v_nom := private.grp_similarite_noms(p_jetons_a, p_jetons_b);
  s := v_nom;
  raisons := jsonb_build_array(jsonb_build_object('critere', 'designation', 'ressemblance', v_nom));
  v_na := array(select distinct x from unnest(p_jetons_a) as x where x ~ '^[0-9.]+$' order by 1);
  v_nb := array(select distinct x from unnest(p_jetons_b) as x where x ~ '^[0-9.]+$' order by 1);
  if cardinality(v_na) > 0 and cardinality(v_nb) > 0 then
    if v_na <> v_nb then
      s := s * 0.5;
    end if;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'quantites', 'egal', v_na = v_nb));
  elsif (cardinality(v_na) > 0) <> (cardinality(v_nb) > 0) then
    s := s * 0.9;
  end if;
  if p_unite_a is not null and p_unite_b is not null then
    if upper(p_unite_a) = upper(p_unite_b) then s := s + 0.05; else s := s * 0.8; end if;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'unite', 'egal', upper(p_unite_a) = upper(p_unite_b)));
  end if;
  if p_fourn_a is not null and p_fourn_b is not null then
    if p_fourn_a = p_fourn_b then s := s + 0.10; else s := s * 0.75; end if;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'fournisseur', 'egal', p_fourn_a = p_fourn_b));
  end if;
  score := round(least(greatest(s, 0), 1), 3);
end $function$


-- ═══ FONCTION private.grp_score_tiers
CREATE OR REPLACE FUNCTION private.grp_score_tiers(p_jetons_a text[], p_jetons_b text[], p_cp_a text, p_cp_b text, p_adr_a text, p_adr_b text, p_tel_a text, p_tel_b text, p_dom_a text, p_dom_b text, p_terr_a text, p_terr_b text, OUT score numeric, OUT raisons jsonb)
 RETURNS record
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v_nom numeric;
  v_adr numeric;
  s numeric;
begin
  v_nom := private.grp_similarite_noms(p_jetons_a, p_jetons_b);
  s := v_nom;
  raisons := jsonb_build_array(jsonb_build_object('critere', 'nom', 'ressemblance', v_nom));
  if p_cp_a is not null and p_cp_b is not null then
    if p_cp_a = p_cp_b then s := s + 0.10; else s := s * 0.75; end if;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'code_postal', 'egal', p_cp_a = p_cp_b));
  end if;
  if p_adr_a is not null and p_adr_b is not null then
    v_adr := private.grp_similarite_trigrammes(p_adr_a, p_adr_b);
    if v_adr >= 0.6 then s := s + 0.10 * v_adr; elsif v_adr < 0.3 then s := s * 0.9; end if;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'adresse', 'ressemblance', v_adr));
  end if;
  if p_tel_a is not null and p_tel_b is not null and p_tel_a = p_tel_b then
    s := s + 0.10;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'telephone', 'egal', true));
  end if;
  if p_dom_a is not null and p_dom_b is not null and p_dom_a = p_dom_b then
    s := s + 0.10;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'domaine', 'egal', true));
  end if;
  if p_terr_a is not null and p_terr_b is not null and p_terr_a <> p_terr_b then
    s := s * 0.85;
    raisons := raisons || jsonb_build_array(jsonb_build_object('critere', 'territoire', 'egal', false,
                                                               'detail', p_terr_a || ' / ' || p_terr_b));
  end if;
  score := round(least(greatest(s, 0), 1), 3);
end $function$


-- ═══ FONCTION private.grp_similarite_jetons
CREATE OR REPLACE FUNCTION private.grp_similarite_jetons(a text[], b text[])
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
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
end $function$


-- ═══ FONCTION private.grp_similarite_noms
CREATE OR REPLACE FUNCTION private.grp_similarite_noms(a text[], b text[])
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
begin
  return greatest(private.grp_similarite_jetons(a, b),
                  private.grp_similarite_trigrammes(array_to_string(a, ' '), array_to_string(b, ' ')));
end $function$


-- ═══ FONCTION private.grp_similarite_trigrammes
CREATE OR REPLACE FUNCTION private.grp_similarite_trigrammes(a text, b text)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
begin
  return private.grp_jaccard(private.grp_trigrammes(a), private.grp_trigrammes(b));
end $function$


-- ═══ FONCTION private.grp_siren_de
CREATE OR REPLACE FUNCTION private.grp_siren_de(p_siren text, p_siret text, p_tva text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case
    when private.grp_siren_valide(regexp_replace(coalesce(p_siren, ''), '[\s.\-]', '', 'g'))
      then regexp_replace(p_siren, '[\s.\-]', '', 'g')
    when private.grp_siret_valide(regexp_replace(coalesce(p_siret, ''), '[\s.\-]', '', 'g'))
      then left(regexp_replace(p_siret, '[\s.\-]', '', 'g'), 9)
    when coalesce(private.grp_tva_normalisee(p_tva), '') ~ '^FR[0-9]{11}$'
         and private.grp_siren_valide(right(private.grp_tva_normalisee(p_tva), 9))
      then right(private.grp_tva_normalisee(p_tva), 9)
  end
$function$


-- ═══ FONCTION private.grp_siren_valide
CREATE OR REPLACE FUNCTION private.grp_siren_valide(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select p ~ '^[0-9]{9}$' and p <> '000000000' and private.grp_luhn(p)
$function$


-- ═══ FONCTION private.grp_siret_valide
CREATE OR REPLACE FUNCTION private.grp_siret_valide(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select p ~ '^[0-9]{14}$' and left(p, 9) <> '000000000'
     and case when left(p, 9) = '356000000'
              then (select sum(substr(p, i, 1)::integer) from generate_series(1, 14) i) % 5 = 0
              else private.grp_luhn(p) end
$function$


-- ═══ FONCTION private.grp_tache_referentiel
CREATE OR REPLACE FUNCTION private.grp_tache_referentiel()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t record;
  v jsonb;
  n_dec integer := 0;
  n_pass integer := 0;
  n_echec integer := 0;
begin
  perform set_config('omega.module', 'varelo', true);
  for t in
    select * from private.prendre_travaux(array['varelo.decision', 'varelo.referentiel.rapprocher'], 20,
                                          interval '30 minutes', 'varelo-referentiel')
  loop
    begin
      if t.genre = 'varelo.decision' then
        if (t.charge ->> 'type_action') = any (private.grp_types_referentiel()) then
          v := private.grp_executer_decisions(t.client_id);
        else
          v := jsonb_build_object('ignore', 'type d''action d''un autre moteur');
        end if;
        n_dec := n_dec + 1;
      else
        v := private.grp_rapprocher(t.client_id, coalesce((t.charge ->> 'complet')::boolean, false));
        n_pass := n_pass + 1;
      end if;
      perform private.finir_travail(t.id, v);
    exception when others then
      perform private.echouer_travail(t.id, left(sqlerrm, 2000), true);
      n_echec := n_echec + 1;
    end;
  end loop;
  return jsonb_build_object('decisions', n_dec, 'passages', n_pass, 'echecs', n_echec);
end $function$


-- ═══ FONCTION private.grp_telephone_cle
CREATE OR REPLACE FUNCTION private.grp_telephone_cle(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select case when length(d) >= 9 then right(d, 9) end
  from (select regexp_replace(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '^00', '') as d) x
$function$


-- ═══ FONCTION private.grp_territoire_cp
CREATE OR REPLACE FUNCTION private.grp_territoire_cp(p_cp text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
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
end $function$


-- ═══ FONCTION private.grp_texte_normalise
CREATE OR REPLACE FUNCTION private.grp_texte_normalise(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select btrim(regexp_replace(
           regexp_replace(
             regexp_replace(upper(private.grp_sans_accents(replace(p, '&', ' ET '))), '[^A-Z0-9]+', ' ', 'g'),
             '\m([A-Z0-9]) (?=[A-Z0-9]\M)', '\1', 'g'),
           '\s+', ' ', 'g'))
$function$


-- ═══ FONCTION private.grp_trigrammes
CREATE OR REPLACE FUNCTION private.grp_trigrammes(p text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
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
end $function$


-- ═══ FONCTION private.grp_tva_normalisee
CREATE OR REPLACE FUNCTION private.grp_tva_normalisee(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
declare
  v text := upper(regexp_replace(coalesce(p, ''), '[\s.\-]', '', 'g'));
begin
  if v ~ '^FR[0-9]{2}[0-9]{9}$' then
    if substr(v, 3, 2)::integer = (12 + 3 * (substr(v, 5, 9)::bigint % 97)) % 97 then
      return v;
    end if;
    return null;
  elsif v ~ '^FR[0-9A-HJ-NP-Z]{2}[0-9]{9}$' then
    return v;
  elsif v ~ '^(AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK|XI|CH|GB|NO)[0-9A-Z+*]{2,12}$' then
    return v;
  end if;
  return null;
end $function$


-- ═══ FONCTION private.grp_types_referentiel
CREATE OR REPLACE FUNCTION private.grp_types_referentiel()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO ''
AS $function$
  select array['rattacher_codes', 'rapprocher_codes', 'rattacher_iban_different', 'fusionner_objets',
               'detacher_code', 'scinder_objet', 'renommer_objet']
$function$


-- ═══ FONCTION private.grp_verifier_societe
CREATE OR REPLACE FUNCTION private.grp_verifier_societe()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.entites;
  v_territoire text;
  v_fuseau text;
begin
  select * into e from public.entites where client_id = new.client_id and id = new.entite_id;
  if not found then
    raise exception 'Entité introuvable.' using errcode = 'P0002';
  end if;
  if e.type <> 'societe' then
    raise exception 'Seule une société entre au groupe dans Varelo ; un site ou un établissement se range sous sa société.'
      using errcode = '23514';
  end if;
  if e.siren is not null and not coalesce(private.grp_siren_valide(e.siren), false) then
    raise exception 'Le SIREN de la société « % » est invalide (%) : l''intragroupe ne se reconnaîtrait pas.', e.nom, e.siren
      using errcode = '22023';
  end if;
  v_territoire := public.territoire_calendrier(e.territoire);
  if v_territoire is null then
    raise exception 'La société « % » n''a pas de territoire lisible (%) : ses délais ne se calculent pas sans lui.',
      e.nom, coalesce(e.territoire, 'aucun') using errcode = '22023', hint = 'Poser entites.territoire : GP, MQ, GF, RE, FR…';
  end if;
  select t.fuseau into v_fuseau from public.territoires t where t.code = v_territoire;
  if e.fuseau <> v_fuseau
     and not (v_territoire = 'polynesie-francaise' and e.fuseau in ('Pacific/Marquesas', 'Pacific/Gambier')) then
    raise exception 'Le fuseau % ne correspond pas au territoire % (%).', e.fuseau, v_territoire, v_fuseau using errcode = '23514';
  end if;
  new.maj_le := now();
  return new;
end $function$


-- ═══ FONCTION public.grp_ajouter_societe
CREATE OR REPLACE FUNCTION public.grp_ajouter_societe(p_client uuid, p_nom text, p_siren text DEFAULT NULL::text, p_territoire text DEFAULT NULL::text, p_fuseau text DEFAULT NULL::text, p_pole uuid DEFAULT NULL::uuid, p_logiciel text DEFAULT NULL::text, p_nomenclature text DEFAULT NULL::text, p_parent uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_territoire text := public.territoire_calendrier(p_territoire);
  v_fuseau text;
  v_parent uuid := p_parent;
  v_siren text := nullif(regexp_replace(coalesce(p_siren, ''), '[\s.\-]', '', 'g'), '');
  v_id uuid;
begin
  if v_territoire is null then
    raise exception 'Territoire illisible : % (GP, MQ, GF, RE, FR…) ; on ne suppose jamais la métropole.', coalesce(p_territoire, 'aucun')
      using errcode = '22023';
  end if;
  select t.fuseau into v_fuseau from public.territoires t where t.code = v_territoire;
  if v_parent is null then
    select e.id into v_parent from public.entites e where e.client_id = p_client and e.principale;
  end if;
  insert into public.entites (client_id, nom, type, siren, parent_id, territoire, fuseau)
  values (p_client, btrim(p_nom), 'societe', v_siren, v_parent, upper(btrim(p_territoire)), coalesce(p_fuseau, v_fuseau))
  returning id into v_id;
  insert into public.grp_societes (client_id, entite_id, pole_id, logiciel, nomenclature)
  values (p_client, v_id, p_pole, nullif(btrim(p_logiciel), ''), nullif(btrim(p_nomenclature), ''));
  return v_id;
end $function$


-- ═══ FONCTION public.grp_appliquer_decisions
CREATE OR REPLACE FUNCTION public.grp_appliquer_decisions(p_client uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_executer_decisions(p_client)
$function$


-- ═══ FONCTION public.grp_demander_rapprochement
CREATE OR REPLACE FUNCTION public.grp_demander_rapprochement(p_client uuid, p_complet boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_demander_rapprochement(p_client, p_complet)
$function$


-- ═══ FONCTION public.grp_deposer_codes
CREATE OR REPLACE FUNCTION public.grp_deposer_codes(p_client uuid, p_entite uuid, p_nature text, p_lignes jsonb, p_source text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_deposer_codes(p_client, p_entite, p_nature, p_lignes, p_source)
$function$


-- ═══ FONCTION public.grp_ecarter_proposition
CREATE OR REPLACE FUNCTION public.grp_ecarter_proposition(p_proposition uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_ecarter_proposition(p_proposition, p_motif)
$function$


-- ═══ FONCTION public.grp_etat_referentiel
CREATE OR REPLACE FUNCTION public.grp_etat_referentiel(p_client uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_object_agg(n.nature, jsonb_build_object(
    'codes', coalesce(k.codes, 0), 'a_traiter', coalesce(k.a_traiter, 0), 'nouveaux', coalesce(k.nouveaux, 0),
    'proposes', coalesce(k.proposes, 0), 'confirmes', coalesce(k.confirmes, 0),
    'objets', (select count(*) from public.grp_ref_objets o where o.client_id = p_client and o.nature = n.nature and o.statut = 'actif'),
    'propositions_ouvertes', (select count(*) from public.grp_ref_propositions q
                              where q.client_id = p_client and q.nature = n.nature and q.statut = 'a_valider'),
    'taux_rattachement', case when coalesce(k.codes, 0) = 0 then null
                              else round((k.codes - k.a_traiter)::numeric / k.codes, 3) end,
    'taux_stable', case when coalesce(k.codes, 0) = 0 then null
                        else round((k.nouveaux + k.confirmes)::numeric / k.codes, 3) end)), '{}'::jsonb)
  from (values ('client'), ('fournisseur'), ('article'), ('site')) as n(nature)
  left join (
    select c.nature, count(*) as codes, count(*) filter (where c.etat = 'a_traiter') as a_traiter,
           count(*) filter (where c.etat = 'nouveau') as nouveaux, count(*) filter (where c.etat = 'propose') as proposes,
           count(*) filter (where c.etat = 'confirme') as confirmes
    from public.grp_ref_codes c where c.client_id = p_client group by c.nature) k on k.nature = n.nature
$function$


-- ═══ FONCTION public.grp_exporter_referentiel
CREATE OR REPLACE FUNCTION public.grp_exporter_referentiel(p_client uuid, p_nature text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_corps text;
  v_n integer;
begin
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''export du référentiel revient au gérant et à l''administrateur (la DSI).' using errcode = '42501';
  end if;
  if p_nature is null or p_nature not in ('client', 'fournisseur', 'article', 'site') then
    raise exception 'Nature inconnue : %.', coalesce(p_nature, 'vide') using errcode = '22023';
  end if;
  select count(*), string_agg(private.grp_csv(o.code_groupe) || ';' || private.grp_csv(o.nom_groupe) || ';'
                              || private.grp_csv(e.nom) || ';' || private.grp_csv(c.code_local) || ';'
                              || private.grp_csv(c.nom_local) || ';' || c.etat, E'\n' order by o.numero, e.nom, c.code_local)
    into v_n, v_corps
  from public.grp_ref_codes c
  join public.grp_ref_objets o on o.id = c.objet_id
  join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
  where c.client_id = p_client and c.nature = p_nature;
  perform private.grp_noter_export(p_client, p_nature, v_n);
  return 'code_groupe;nom_groupe;societe;code_local;nom_local;etat' || case when v_n > 0 then E'\n' || v_corps else '' end;
end $function$


-- ═══ FONCTION public.grp_installer
CREATE OR REPLACE FUNCTION public.grp_installer(p_client uuid, p_equipe_referent text DEFAULT 'referent_donnees'::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_installer(p_client, p_equipe_referent)
$function$


-- ═══ FONCTION public.grp_proposer_detachement
CREATE OR REPLACE FUNCTION public.grp_proposer_detachement(p_code uuid, p_raison text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_proposer('detacher', p_code, null, null, null, null, p_raison)
$function$


-- ═══ FONCTION public.grp_proposer_fusion
CREATE OR REPLACE FUNCTION public.grp_proposer_fusion(p_objet_source uuid, p_objet_cible uuid, p_raison text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_proposer('fusionner', null, null, p_objet_source, p_objet_cible, null, p_raison)
$function$


-- ═══ FONCTION public.grp_proposer_nom
CREATE OR REPLACE FUNCTION public.grp_proposer_nom(p_objet uuid, p_nom text, p_raison text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_proposer('renommer', null, null, null, p_objet, p_nom, p_raison)
$function$


-- ═══ FONCTION public.grp_proposer_rattachement
CREATE OR REPLACE FUNCTION public.grp_proposer_rattachement(p_code uuid, p_objet_cible uuid, p_raison text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_proposer('deplacer', p_code, null, null, p_objet_cible, null, p_raison)
$function$


-- ═══ FONCTION public.grp_proposer_scission
CREATE OR REPLACE FUNCTION public.grp_proposer_scission(p_objet uuid, p_codes uuid[], p_raison text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_proposer('scinder', null, p_codes, null, p_objet, null, p_raison)
$function$


-- ═══ FONCTION public.grp_rapprocher
CREATE OR REPLACE FUNCTION public.grp_rapprocher(p_client uuid, p_complet boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.grp_rapprocher(p_client, p_complet)
$function$



-- ══════════════════ CRONS ══════════════════

-- ═══ CRON varelo-referentiel [* * * * *] select private.grp_tache_referentiel()

-- ═══ CRON varelo-referentiel-hebdo [45 4 * * 0] select private.grp_planifier_referentiel(true)

-- ═══ CRON varelo-referentiel-quotidien [30 4 * * *] select private.grp_planifier_referentiel(false)
