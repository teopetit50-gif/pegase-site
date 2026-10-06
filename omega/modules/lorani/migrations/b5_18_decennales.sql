-- LORANI, lot B5-18 — les attestations décennales des entreprises, lues et contrôlées contre le lot.
--
-- Pourquoi : n° 3 du carnet (« décennales : attestations lues, échéances ») et la promesse de la page des architectes :
-- « Lorani lit chaque attestation décennale et vérifie que les activités couvertes correspondent au lot attribué, ainsi
-- que les dates et le plafond. C'est un contrôle que l'architecte doit au maître d'ouvrage, et le registre en garde la
-- date. » Règles : l'assurance de responsabilité décennale est obligatoire pour tout constructeur et doit être souscrite
-- à l'ouverture du chantier (C. assur., art. L241-1 et L243-1-1 ; C. civ., art. 1792) ; l'attestation mentionne les
-- activités garanties et la période de validité (C. assur., art. L243-2, arrêté du 5 janvier 2016, modèle
-- d'attestation) ; seules les activités déclarées sont couvertes.
--
-- Ce qui est posé :
--   · private.lorani_activite(slug) → libellé : le vocabulaire fermé des activités (repris de la nomenclature des
--     activités du BTP de France Assureurs, simplifiée) — le même pour lorani_lots.activites_requises et pour les
--     activités lues sur une attestation (fiche de lecture, type lorani_attestation_decennale).
--   · lorani_lots : les activités requises sont nettoyées (minuscules, sans doublon) par un trigger.
--   · lorani_projets.ouverture_chantier (date de la déclaration d'ouverture du chantier) : la date que l'attestation
--     doit couvrir ; sans elle, on vérifie la validité au jour du contrôle.
--   · public.lorani_attestations : une attestation (entreprise = intervenant, lot, pièce lue, assureur, police, assuré,
--     SIREN, activités, début, fin, plafond), son statut a_verifier | conforme | non_conforme | expiree, ses constats
--     [{code, gravite, texte}] et son échéance au registre des délais (delai_id).
--   · private.lorani_attestation_verifier (trigger BEFORE) : activités requises du lot non couvertes ; date
--     d'ouverture du chantier hors période (ou attestation échue) ; plafond inférieur au marché du lot ; SIREN ou nom
--     de l'assuré différents de l'entreprise. Pose l'échéance (fin de validité, rappels J-30, J-7, J) quand la fin est
--     à venir ; l'annule si la fin change. Alerte « attention » au chef de projet si non conforme ; journal
--     lorani.attestation_controlee (la date du contrôle, « le registre en garde la date »).
--   · private.lorani_poser_attestation_lue(piece) : une attestation lue par le lecteur devient une ligne (entreprise
--     reconnue par SIREN ou par nom) ; le passage des lectures l'appelle pour le type lorani_attestation_decennale.
--   · Abonnements delai.proche.lorani / delai.depasse.lorani → lorani.attestation.rappel / .depasse ;
--     private.lorani_attestation_rappeler(travaux) ignore les délais qui ne sont pas d'une attestation.
--   · private.lorani_lectures_passage() (corps de b5_17) prend ces genres et ce type.
-- Fonctions nouvelles de private fermées au public. Migration idempotente ; rien n'est retiré.

-- ——— le vocabulaire des activités ———

CREATE OR REPLACE FUNCTION private.lorani_activite(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p
    when 'demolition' then 'Démolition'
    when 'terrassement' then 'Terrassement'
    when 'vrd' then 'Voirie et réseaux divers'
    when 'amelioration_sols' then 'Amélioration des sols'
    when 'fondations_speciales' then 'Fondations spéciales'
    when 'maconnerie_beton_arme' then 'Maçonnerie et béton armé'
    when 'pierre_taille' then 'Taille de pierre et maçonnerie de pierre'
    when 'charpente_bois' then 'Charpente et structure en bois'
    when 'charpente_metallique' then 'Charpente et structure métallique'
    when 'couverture' then 'Couverture'
    when 'etancheite_toiture' then 'Étanchéité de toiture, terrasse et plancher intérieur'
    when 'etancheite_cuvelage' then 'Cuvelage et étanchéité des parties enterrées'
    when 'facades_rideaux' then 'Façades-rideaux'
    when 'bardage' then 'Bardage de façade'
    when 'menuiseries_exterieures' then 'Menuiseries extérieures'
    when 'ite' then 'Isolation thermique par l''extérieur'
    when 'ravalement' then 'Ravalement et revêtement de façade'
    when 'menuiseries_interieures' then 'Menuiseries intérieures'
    when 'platrerie' then 'Plâtrerie, staff, cloisons'
    when 'serrurerie' then 'Serrurerie et métallerie'
    when 'vitrerie' then 'Vitrerie et miroiterie'
    when 'peinture' then 'Peinture'
    when 'revetements_durs' then 'Revêtements en matériaux durs (carrelage, pierre)'
    when 'revetements_souples' then 'Revêtements en matériaux souples'
    when 'isolation_interieure' then 'Isolation thermique et acoustique intérieure'
    when 'plomberie' then 'Plomberie et installations sanitaires'
    when 'chauffage' then 'Installations de chauffage'
    when 'ventilation' then 'Ventilation et climatisation'
    when 'electricite' then 'Électricité et télécommunications'
    when 'photovoltaique' then 'Installations photovoltaïques'
    when 'ascenseurs' then 'Ascenseurs'
    when 'ssi' then 'Systèmes de sécurité incendie'
    when 'piscines' then 'Piscines'
    when 'amiante' then 'Traitement de l''amiante'
  end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_activite(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_lots_activites()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.activites_requises := coalesce((select array_agg(distinct x order by x) from unnest(new.activites_requises) a(v), lateral (select lower(btrim(a.v)) as x) y where y.x <> ''), '{}');
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_lots_activites() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_lots'::regclass and tgname = 'lorani_lots_activites') then
    create trigger lorani_lots_activites before insert or update of activites_requises on public.lorani_lots
      for each row execute function private.lorani_lots_activites();
  end if;
end $$;

ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS ouverture_chantier date;

-- ——— les attestations ———

CREATE TABLE IF NOT EXISTS public.lorani_attestations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  intervenant_id uuid,
  lot_id uuid,
  piece_id uuid,
  assureur text,
  numero_police text,
  assure text,
  siren text,
  activites text[] NOT NULL DEFAULT '{}',
  debut date,
  fin date,
  plafond_eur numeric(14,2),
  statut text NOT NULL DEFAULT 'a_verifier',
  constats jsonb NOT NULL DEFAULT '[]'::jsonb,
  verifie_le timestamptz,
  delai_id uuid,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_attestations_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_attestations_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_attestations_piece_key UNIQUE (piece_id),
  CONSTRAINT lorani_attestations_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_attestations_intervenant_fkey FOREIGN KEY (client_id, intervenant_id) REFERENCES public.lorani_intervenants (client_id, id),
  CONSTRAINT lorani_attestations_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_attestations_statut_check CHECK (statut = ANY (ARRAY['a_verifier', 'conforme', 'non_conforme', 'expiree'])),
  CONSTRAINT lorani_attestations_siren_check CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  CONSTRAINT lorani_attestations_textes_check CHECK (char_length(coalesce(assureur, '')) <= 160 AND char_length(coalesce(numero_police, '')) <= 80 AND char_length(coalesce(assure, '')) <= 200),
  CONSTRAINT lorani_attestations_periode_check CHECK (debut IS NULL OR fin IS NULL OR fin >= debut),
  CONSTRAINT lorani_attestations_plafond_check CHECK (plafond_eur IS NULL OR plafond_eur > 0),
  CONSTRAINT lorani_attestations_activites_check CHECK (cardinality(activites) <= 80)
);
CREATE INDEX IF NOT EXISTS lorani_attestations_projet_idx ON public.lorani_attestations (projet_id, lot_id);
ALTER TABLE public.lorani_attestations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lorani_attestations FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_attestations TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_attestations' and policyname = 'on voit les attestations des projets qu''on voit') then
    create policy "on voit les attestations des projets qu'on voit" on public.lorani_attestations for select to authenticated
      using (private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_attestations' and policyname = 'qui ecrit sur le projet saisit une attestation') then
    create policy "qui ecrit sur le projet saisit une attestation" on public.lorani_attestations for insert to authenticated
      with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_attestations' and policyname = 'qui ecrit sur le projet corrige une attestation') then
    create policy "qui ecrit sur le projet corrige une attestation" on public.lorani_attestations for update to authenticated
      using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
end $$;

-- Le contrôle : à chaque saisie ou correction.
CREATE OR REPLACE FUNCTION private.lorani_attestation_verifier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  i public.lorani_intervenants;
  lo public.lorani_lots;
  v_constats jsonb := '[]'::jsonb;
  v_manque text[];
  v_date date;
  v_marche numeric;
  v_ouvert boolean;
  v_echeance date;
  v_entreprise text;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  new.assureur := nullif(btrim(new.assureur), '');
  new.numero_police := nullif(btrim(new.numero_police), '');
  new.assure := nullif(btrim(regexp_replace(new.assure, '\s+', ' ', 'g')), '');
  new.siren := nullif(regexp_replace(coalesce(new.siren, ''), '\s', '', 'g'), '');
  new.activites := coalesce((select array_agg(distinct x order by x) from unnest(new.activites) a(v), lateral (select lower(btrim(a.v)) as x) y where y.x <> ''), '{}');
  if new.intervenant_id is not null then
    select * into i from public.lorani_intervenants where id = new.intervenant_id and projet_id = new.projet_id;
    if not found then
      raise exception 'Cette entreprise n''est pas un intervenant du projet.' using errcode = '22023';
    end if;
    new.lot_id := coalesce(new.lot_id, i.lot_id);
  end if;
  if new.lot_id is not null then
    select * into lo from public.lorani_lots where id = new.lot_id;
  end if;
  v_entreprise := coalesce(i.organisme, new.assure, 'l''entreprise');

  -- 1. les activités du lot
  if lo.id is not null and cardinality(lo.activites_requises) > 0 then
    select array_agg(a order by a) into v_manque from unnest(lo.activites_requises) a where not (a = any (new.activites));
    if v_manque is not null then
      v_constats := v_constats || jsonb_build_object('code', 'activite', 'gravite', 'bloquant',
        'texte', format('Activité%s du lot %s non couverte%s : %s.', case when cardinality(v_manque) > 1 then 's' else '' end, lo.numero,
                        case when cardinality(v_manque) > 1 then 's' else '' end,
                        (select string_agg(coalesce(private.lorani_activite(m), m), ', ') from unnest(v_manque) m)),
        'activites', to_jsonb(v_manque));
    end if;
  elsif lo.id is not null then
    v_constats := v_constats || jsonb_build_object('code', 'activites_lot', 'gravite', 'mineur',
      'texte', format('Les activités requises du lot %s ne sont pas renseignées : la couverture ne peut pas être vérifiée.', lo.numero));
  end if;

  -- 2. les dates : l'ouverture du chantier, sinon aujourd'hui
  v_date := coalesce(pr.ouverture_chantier, current_date);
  if new.debut is null or new.fin is null then
    v_constats := v_constats || jsonb_build_object('code', 'periode', 'gravite', 'majeur', 'texte', 'La période de validité n''est pas lisible sur l''attestation.');
  elsif v_date < new.debut or v_date > new.fin then
    v_constats := v_constats || jsonb_build_object('code', 'periode', 'gravite', 'bloquant',
      'texte', format('%s (%s) hors de la période de validité de l''attestation (du %s au %s).',
                      case when pr.ouverture_chantier is not null then 'Ouverture du chantier' else 'Date du contrôle' end,
                      to_char(v_date, 'DD/MM/YYYY'), to_char(new.debut, 'DD/MM/YYYY'), to_char(new.fin, 'DD/MM/YYYY')));
  end if;

  -- 3. le plafond contre le marché du lot
  if new.plafond_eur is not null and new.lot_id is not null then
    select max(m.montant_ht + m.avenants_ht) into v_marche from public.lorani_marches m
    where m.lot_id = new.lot_id and m.actif and (i.id is null or private.lorani_nom_comparable(m.titulaire) = private.lorani_nom_comparable(i.organisme) or (select count(*) from public.lorani_marches x where x.lot_id = new.lot_id and x.actif) = 1);
    if v_marche is not null and new.plafond_eur < v_marche then
      v_constats := v_constats || jsonb_build_object('code', 'plafond', 'gravite', 'majeur',
        'texte', format('Plafond de garantie (%s €) inférieur au marché du lot (%s € HT).',
                        regexp_replace(trunc(new.plafond_eur)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g'), regexp_replace(trunc(v_marche)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g')));
    end if;
  end if;

  -- 4. l'assuré est-il bien l'entreprise ?
  if i.id is not null and new.siren is not null and i.siren is not null and new.siren <> i.siren then
    v_constats := v_constats || jsonb_build_object('code', 'siren', 'gravite', 'bloquant',
      'texte', format('SIREN de l''assuré (%s) différent de celui de l''entreprise (%s).', new.siren, i.siren));
  elsif i.id is not null and new.assure is not null and private.lorani_nom_comparable(new.assure) is distinct from private.lorani_nom_comparable(i.organisme)
        and (new.siren is null or i.siren is null) then
    v_constats := v_constats || jsonb_build_object('code', 'assure', 'gravite', 'mineur',
      'texte', format('Assuré « %s » : nom différent de l''entreprise « %s », à vérifier.', left(new.assure, 80), left(i.organisme, 80)));
  end if;
  if i.id is null then
    v_constats := v_constats || jsonb_build_object('code', 'entreprise', 'gravite', 'majeur', 'texte', 'Entreprise non reconnue parmi les intervenants du projet : rattachez l''attestation.');
  end if;

  new.constats := v_constats;
  new.statut := case when new.fin is not null and new.fin < current_date then 'expiree'
                     when exists (select 1 from jsonb_array_elements(v_constats) c where c ->> 'gravite' in ('bloquant', 'majeur')) then 'non_conforme'
                     else 'conforme' end;
  new.verifie_le := now();
  new.maj_le := now();

  -- 5. l'échéance au registre : la fin de validité, si elle est à venir
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_echeance from public.delais d where d.id = new.delai_id;
  if coalesce(v_ouvert, false) and (new.fin is null or v_echeance is distinct from new.fin) then
    perform private.clore_delai(new.delai_id, 'annule', left(format('Fin de validité de l''attestation modifiée : %s.', coalesce(to_char(new.fin, 'DD/MM/YYYY'), 'illisible')), 300));
    new.delai_id := null;
    v_ouvert := false;
  end if;
  if not coalesce(v_ouvert, false) and new.fin is not null and new.fin >= current_date and pr.territoire is not null then
    begin
      new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
        left(format('Décennale : %s (%s) expire', v_entreprise, coalesce(new.assureur, 'assureur ?')), 200), new.fin,
        left(format('Attestation %s%s, valable jusqu''au %s.', coalesce(new.assureur, ''), coalesce(' n° ' || new.numero_police, ''), to_char(new.fin, 'DD/MM/YYYY')), 300),
        pr.territoire, array[30, 7, 0], private.lorani_chef_de_projet(new.client_id, new.projet_id),
        'Demander à l''entreprise l''attestation de la période suivante.',
        format('lorani:attestation:%s:%s', new.id, new.fin));
    exception when others then
      new.delai_id := null;
    end;
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_attestation_verifier() FROM PUBLIC;

-- Après le contrôle : l'alerte et le journal (la date du contrôle est opposable).
CREATE OR REPLACE FUNCTION private.lorani_attestation_signaler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_entreprise text;
begin
  if tg_op = 'UPDATE' and new.constats is not distinct from old.constats and new.statut = old.statut then
    return null;
  end if;
  select * into pr from public.lorani_projets where id = new.projet_id;
  v_entreprise := coalesce((select organisme from public.lorani_intervenants where id = new.intervenant_id), new.assure, 'entreprise inconnue');
  perform private.journaliser_module(new.client_id, 'lorani', 'lorani.attestation_controlee', 'lorani_projet', new.projet_id::text,
    jsonb_build_object('attestation', new.id, 'entreprise', v_entreprise, 'lot', new.lot_id, 'statut', new.statut, 'constats', new.constats,
                       'assureur', new.assureur, 'police', new.numero_police, 'debut', new.debut, 'fin', new.fin), new.entite_id);
  if new.statut in ('non_conforme', 'expiree') then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('« %s » : décennale de %s %s — %s', left(pr.nom, 40), left(v_entreprise, 50),
                  case new.statut when 'expiree' then 'échue' else 'non conforme' end,
                  coalesce((select c ->> 'texte' from jsonb_array_elements(new.constats) c order by case c ->> 'gravite' when 'bloquant' then 0 when 'majeur' then 1 else 2 end limit 1),
                           format('fin de validité le %s.', to_char(new.fin, 'DD/MM/YYYY')))), 200),
      jsonb_build_object('projet', new.projet_id, 'attestation', new.id, 'constats', new.constats, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('attestation:%s', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_attestation_signaler() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_attestations'::regclass and tgname = 'lorani_attestations_verifier') then
    create trigger lorani_attestations_verifier before insert or update of intervenant_id, lot_id, assureur, numero_police, assure, siren, activites, debut, fin, plafond_eur
      on public.lorani_attestations for each row execute function private.lorani_attestation_verifier();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_attestations'::regclass and tgname = 'lorani_attestations_signaler') then
    create trigger lorani_attestations_signaler after insert or update on public.lorani_attestations
      for each row execute function private.lorani_attestation_signaler();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_attestations'::regclass and tgname = 'lorani_attestations_tracer') then
    create trigger lorani_attestations_tracer after insert or update on public.lorani_attestations
      for each row execute function private.tracer('+projet_id', '+intervenant_id', '+lot_id', '+statut', '+debut', '+fin', '+activites');
  end if;
end $$;

-- Un changement des activités du lot, du marché ou de la date d'ouverture : les attestations du projet sont revues.
CREATE OR REPLACE FUNCTION private.lorani_attestations_revoir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  n jsonb := to_jsonb(new);
begin
  -- to_jsonb : les trois tables n'ont pas les mêmes colonnes (id du projet, id du lot, lot du marché)
  if tg_table_name = 'lorani_projets' then
    update public.lorani_attestations a set activites = a.activites where a.projet_id = (n ->> 'id')::uuid;
  elsif tg_table_name = 'lorani_lots' then
    update public.lorani_attestations a set activites = a.activites where a.lot_id = (n ->> 'id')::uuid;
  else
    update public.lorani_attestations a set activites = a.activites where a.lot_id = (n ->> 'lot_id')::uuid;
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_attestations_revoir() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_lots'::regclass and tgname = 'lorani_lots_revoir_attestations') then
    create trigger lorani_lots_revoir_attestations after update of activites_requises on public.lorani_lots
      for each row execute function private.lorani_attestations_revoir();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_projets'::regclass and tgname = 'lorani_projets_revoir_attestations') then
    create trigger lorani_projets_revoir_attestations after update of ouverture_chantier on public.lorani_projets
      for each row execute function private.lorani_attestations_revoir();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_marches'::regclass and tgname = 'lorani_marches_revoir_attestations') then
    create trigger lorani_marches_revoir_attestations after insert or update of montant_ht, avenants_ht, actif on public.lorani_marches
      for each row execute function private.lorani_attestations_revoir();
  end if;
end $$;

-- ——— l'attestation lue ———

CREATE OR REPLACE FUNCTION private.lorani_poser_attestation_lue(p_piece uuid)
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
  v_inter uuid;
  v_id uuid;
  v_act text[];
begin
  select * into p from public.pieces where id = p_piece;
  if not found or p.module <> 'lorani' or p.objet_type <> 'lorani_projet' then
    return jsonb_build_object('ignore', 'pièce hors des projets');
  end if;
  if exists (select 1 from public.lorani_attestations where piece_id = p_piece) then
    return jsonb_build_object('deja', true);
  end if;
  select * into pr from public.lorani_projets where id = p.objet_id::uuid;
  for r in select pv.champ, pv.valeur from public.pieces_valeurs pv where pv.piece_id = p_piece and pv.chiffre is null loop
    v := v || jsonb_build_object(r.champ, r.valeur);
  end loop;
  v_act := coalesce((select array_agg(x #>> '{}') from jsonb_array_elements(case jsonb_typeof(v -> 'activites') when 'array' then v -> 'activites' else '[]'::jsonb end) x), '{}');
  -- l'entreprise : par SIREN, sinon par le nom
  select i.id into v_inter from public.lorani_intervenants i
  where i.projet_id = pr.id and i.actif and i.nature = 'entreprise'
    and ((v ->> 'siren' is not null and i.siren = regexp_replace(v ->> 'siren', '\s', '', 'g'))
         or private.lorani_nom_comparable(i.organisme) = private.lorani_nom_comparable(v ->> 'assure'))
  order by (i.siren = regexp_replace(coalesce(v ->> 'siren', ''), '\s', '', 'g')) desc nulls last
  limit 1;
  insert into public.lorani_attestations (client_id, entite_id, projet_id, intervenant_id, piece_id, assureur, numero_police, assure, siren, activites, debut, fin, plafond_eur, cree_par)
  values (pr.client_id, pr.entite_id, pr.id, v_inter, p_piece, left(v ->> 'assureur', 160), left(v ->> 'numero_police', 80), left(v ->> 'assure', 200),
          case when regexp_replace(coalesce(v ->> 'siren', ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(v ->> 'siren', '\s', '', 'g') end,
          v_act,
          case when v ->> 'debut' ~ '^\d{4}-\d{2}-\d{2}$' then (v ->> 'debut')::date end,
          case when v ->> 'fin' ~ '^\d{4}-\d{2}-\d{2}$' then (v ->> 'fin')::date end,
          case when v ->> 'plafond_eur' ~ '^[0-9]+(\.[0-9]+)?$' and (v ->> 'plafond_eur')::numeric > 0 then (v ->> 'plafond_eur')::numeric end,
          p.depose_par)
  returning id into v_id;
  return jsonb_build_object('attestation', v_id, 'entreprise', v_inter);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_poser_attestation_lue(uuid) FROM PUBLIC;

-- ——— les rappels de l'échéance ———

insert into private.abonnements (evenement, module, genre)
select 'delai.proche.lorani', 'lorani', 'lorani.attestation.rappel'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.proche.lorani' and a.module = 'lorani' and a.genre = 'lorani.attestation.rappel');
insert into private.abonnements (evenement, module, genre)
select 'delai.depasse.lorani', 'lorani', 'lorani.attestation.depasse'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.depasse.lorani' and a.module = 'lorani' and a.genre = 'lorani.attestation.depasse');

CREATE OR REPLACE FUNCTION private.lorani_attestation_rappeler(t public.travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a public.lorani_attestations;
  pr public.lorani_projets;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
  v_entreprise text;
begin
  select * into a from public.lorani_attestations where delai_id = (t.charge ->> 'delai')::uuid;
  if not found then
    return jsonb_build_object('ignore', 'délai hors des attestations');
  end if;
  -- une attestation plus récente de la même entreprise couvre déjà la suite : rien à dire
  if exists (select 1 from public.lorani_attestations b where b.projet_id = a.projet_id and b.intervenant_id is not distinct from a.intervenant_id
               and b.id <> a.id and b.fin > a.fin) then
    return jsonb_build_object('ignore', 'attestation suivante déjà reçue', 'attestation', a.id);
  end if;
  select * into pr from public.lorani_projets where id = a.projet_id;
  v_entreprise := coalesce((select organisme from public.lorani_intervenants where id = a.intervenant_id), a.assure, 'l''entreprise');
  if t.genre = 'lorani.attestation.depasse' then
    update public.lorani_attestations set statut = 'expiree', maj_le = now() where id = a.id and statut <> 'expiree';
  end if;
  perform private.lever_alerte_module(a.client_id, 'lorani', 'attention',
    left(case when t.genre = 'lorani.attestation.depasse'
      then format('« %s » : la décennale de %s est échue depuis le %s ; demandez la nouvelle attestation.', left(pr.nom, 50), left(v_entreprise, 60), to_char(a.fin, 'DD/MM/YYYY'))
      else format('« %s » : la décennale de %s expire le %s (%s) ; demandez la nouvelle attestation.', left(pr.nom, 50), left(v_entreprise, 60), to_char(a.fin, 'DD/MM/YYYY'),
                  case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end) end, 200),
    jsonb_build_object('projet', a.projet_id, 'attestation', a.id, 'fin', a.fin, 'lien', private.lorani_lien_projet(a.projet_id)),
    case when t.genre = 'lorani.attestation.depasse' then format('attestation:%s:echue', a.id) else format('attestation:%s:rappel:%s', a.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(a.client_id, a.projet_id));
  return jsonb_build_object('attestation', a.id, 'genre', t.genre, 'rappel', v_rappel);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_attestation_rappeler(public.travaux) FROM PUBLIC;

-- Le passage des lectures (corps de b5_17) : attestations lues, rappels et échéances des attestations.
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
                                                       'lorani.attestation.rappel', 'lorani.attestation.depasse'],
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
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type = 'lorani_attestation_decennale' then
        v_res := private.lorani_poser_attestation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement', 'lorani_metre')
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
