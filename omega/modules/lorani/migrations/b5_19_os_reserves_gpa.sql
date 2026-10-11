-- LORANI, lot B5-19 — le chantier, suite : les ordres de service et leur incidence sur le montant et le délai ; les
-- réserves suivies jusqu'à leur levée ; la garantie de parfait achèvement.
--
-- Pourquoi : n° 4 du carnet et la promesse de la page des architectes : « calcule l'incidence de chaque ordre de
-- service sur le montant et le délai, puis suit chaque réserve jusqu'à sa levée et la fin de la garantie de parfait
-- achèvement ». Règles reprises :
--   · ordre de service : l'entreprise qui l'estime contestable émet ses réserves dans les QUINZE jours de sa notification
--     (CCAG-Travaux 2021, art. 3.8.2) ; un ordre de service peut porter un prix nouveau et une incidence sur le délai ;
--   · marché public de travaux : une modification se fait sans nouvelle procédure tant qu'elle reste sous les seuils
--     européens et sous 15 % du montant initial (CCP, art. R2194-8) — au-delà, l'examiner (avenant, nouvelle procédure) ;
--   · réception avec ou sans réserves (C. civ., art. 1792-6) ; garantie de parfait achèvement d'UN AN à compter de la
--     réception, pour les désordres signalés par réserves ou par notification écrite ;
--   · retenue de garantie : libérée un an après la réception, sauf opposition motivée par l'inexécution des obligations
--     de parfait achèvement (loi n° 71-584 du 16 juillet 1971, art. 2).
--
-- Ce qui est posé :
--   · lorani_marches : delai_execution_jours (le délai contractuel) et demarrage_le (posé par l'OS de démarrage).
--   · lorani_projets : reception_le (date de la réception) et gpa_delai_id (l'échéance « fin de la GPA »).
--   · public.lorani_ordres_service : l'OS n° k d'un marché (nature demarrage | travaux_modificatifs |
--     travaux_supplementaires | arret | reprise | autre, objet, émis le, notifié le, incidence HT, incidence en jours,
--     statut emis | signe | signe_reserves | refuse, réserves de l'entreprise, « réserves possibles jusqu'au » = notifié
--     + 15 jours). L'OS de démarrage date le marché ; chaque OS est relu : cumul > 15 % du marché initial (public) ou
--     > 10 % (privé) → alerte « attention » ; incidence sur le délai → alerte info avec la nouvelle fin contractuelle.
--   · public.lorani_os_incidence (vue, sous la RLS de l'appelant) : par marché, montant initial, avenants, OS cumulés,
--     montant à date, part du marché, délai initial, jours d'OS, jours d'arrêt, démarrage, fin contractuelle.
--   · public.lorani_reserves : la réserve n° k du projet (lot, marché, intitulé, localisation, origine reception | opr |
--     gpa, constatée le, à lever avant, statut ouverte | levee | contestee, levée le, motif) ; « à lever avant » est une
--     échéance du registre (rappels J-7, J), tenue à la levée.
--   · La réception datée sur le projet : l'échéance « fin de la GPA » (réception + 1 an, rappels J-60, J-30, J-7, J).
--   · Abonnements delai.proche/depasse.lorani → lorani.chantier.rappel/.depasse ; private.lorani_chantier_rappeler :
--     réserve à lever (si encore ouverte), ou fin de la GPA avec le compte des réserves non levées par lot et la
--     retenue de garantie à conserver.
--   · private.lorani_lectures_passage() (corps de b5_18) prend ces genres.
-- Clés étrangères sans effacement en cascade. Fonctions nouvelles de private fermées au public. Migration idempotente.

ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS delai_execution_jours integer;
ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS demarrage_le date;
ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS reception_le date;
ALTER TABLE public.lorani_projets ADD COLUMN IF NOT EXISTS gpa_delai_id uuid;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_delai_execution_check') then
    alter table public.lorani_marches add constraint lorani_marches_delai_execution_check CHECK (delai_execution_jours IS NULL OR delai_execution_jours BETWEEN 1 AND 3650);
  end if;
end $$;

-- ——— les ordres de service ———

CREATE TABLE IF NOT EXISTS public.lorani_ordres_service (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  marche_id uuid NOT NULL,
  numero smallint,
  nature text NOT NULL DEFAULT 'travaux_modificatifs',
  objet text NOT NULL,
  emis_le date NOT NULL DEFAULT current_date,
  notifie_le date,
  montant_ht numeric(14,2) NOT NULL DEFAULT 0,
  delai_jours integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'emis',
  reserves_entreprise text,
  reserves_jusquau date,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_ordres_service_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_ordres_service_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_ordres_service_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_ordres_service_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES public.lorani_marches (client_id, id),
  CONSTRAINT lorani_ordres_service_une_fois UNIQUE (marche_id, numero),
  CONSTRAINT lorani_ordres_service_nature_check CHECK (nature = ANY (ARRAY['demarrage', 'travaux_modificatifs', 'travaux_supplementaires', 'arret', 'reprise', 'autre'])),
  CONSTRAINT lorani_ordres_service_statut_check CHECK (statut = ANY (ARRAY['emis', 'signe', 'signe_reserves', 'refuse'])),
  CONSTRAINT lorani_ordres_service_objet_check CHECK (char_length(btrim(objet)) BETWEEN 1 AND 300),
  CONSTRAINT lorani_ordres_service_montant_check CHECK (montant_ht BETWEEN -1000000000 AND 1000000000),
  CONSTRAINT lorani_ordres_service_delai_check CHECK (delai_jours BETWEEN -3650 AND 3650),
  CONSTRAINT lorani_ordres_service_numero_check CHECK (numero IS NULL OR numero BETWEEN 1 AND 999),
  CONSTRAINT lorani_ordres_service_reserves_check CHECK (statut <> 'signe_reserves' OR char_length(btrim(coalesce(reserves_entreprise, ''))) >= 3),
  CONSTRAINT lorani_ordres_service_dates_check CHECK (notifie_le IS NULL OR notifie_le >= emis_le)
);
ALTER TABLE public.lorani_ordres_service ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_reserves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid,
  marche_id uuid,
  numero smallint,
  intitule text NOT NULL,
  localisation text,
  origine text NOT NULL DEFAULT 'reception',
  constatee_le date NOT NULL DEFAULT current_date,
  lever_avant date,
  statut text NOT NULL DEFAULT 'ouverte',
  levee_le date,
  motif text,
  delai_id uuid,
  cree_par uuid DEFAULT auth.uid(),
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_reserves_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_reserves_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_reserves_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_reserves_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_reserves_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES public.lorani_marches (client_id, id),
  CONSTRAINT lorani_reserves_une_fois UNIQUE (projet_id, numero),
  CONSTRAINT lorani_reserves_origine_check CHECK (origine = ANY (ARRAY['reception', 'opr', 'gpa'])),
  CONSTRAINT lorani_reserves_statut_check CHECK (statut = ANY (ARRAY['ouverte', 'levee', 'contestee'])),
  CONSTRAINT lorani_reserves_intitule_check CHECK (char_length(btrim(intitule)) BETWEEN 1 AND 300),
  CONSTRAINT lorani_reserves_localisation_check CHECK (localisation IS NULL OR char_length(localisation) <= 200),
  CONSTRAINT lorani_reserves_motif_check CHECK (motif IS NULL OR char_length(motif) <= 500),
  CONSTRAINT lorani_reserves_levee_check CHECK (statut <> 'levee' OR levee_le IS NOT NULL),
  CONSTRAINT lorani_reserves_contestee_check CHECK (statut <> 'contestee' OR char_length(btrim(coalesce(motif, ''))) >= 3),
  CONSTRAINT lorani_reserves_numero_check CHECK (numero IS NULL OR numero BETWEEN 1 AND 9999)
);
ALTER TABLE public.lorani_reserves ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lorani_ordres_service, public.lorani_reserves FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_ordres_service, public.lorani_reserves TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_ordres_service', 'lorani_reserves'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit le chantier des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit le chantier des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet tient le chantier') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet tient le chantier', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet met le chantier a jour') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet met le chantier a jour', t);
    end if;
  end loop;
end $$;

-- L'incidence des OS, marché par marché (sous la RLS de qui lit).
CREATE OR REPLACE VIEW public.lorani_os_incidence WITH (security_invoker = true) AS
  select m.id as marche_id, m.projet_id, m.lot_id, m.titulaire,
         m.montant_ht as montant_initial, m.avenants_ht,
         coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0) as os_montant_ht,
         m.montant_ht + m.avenants_ht + coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0) as montant_a_date,
         round(100 * (m.avenants_ht + coalesce(sum(o.montant_ht) filter (where o.statut <> 'refuse'), 0)) / m.montant_ht, 1) as part_pct,
         m.delai_execution_jours,
         coalesce(sum(o.delai_jours) filter (where o.statut <> 'refuse' and o.nature not in ('arret', 'reprise')), 0)::integer as os_jours,
         coalesce((select sum(greatest(0, coalesce(rp.d, current_date) - a.d))
                   from (select x.marche_id, coalesce(x.notifie_le, x.emis_le) as d,
                                row_number() over (partition by x.marche_id order by coalesce(x.notifie_le, x.emis_le), x.numero) as n
                         from public.lorani_ordres_service x where x.marche_id = m.id and x.nature = 'arret' and x.statut <> 'refuse') a
                   left join lateral (select coalesce(y.notifie_le, y.emis_le) as d from public.lorani_ordres_service y
                                      where y.marche_id = m.id and y.nature = 'reprise' and y.statut <> 'refuse'
                                        and coalesce(y.notifie_le, y.emis_le) >= a.d order by coalesce(y.notifie_le, y.emis_le) limit 1) rp on true), 0)::integer as arret_jours,
         m.demarrage_le,
         count(o.id)::integer as os_nb
  from public.lorani_marches m
  left join public.lorani_ordres_service o on o.marche_id = m.id
  group by m.id;
REVOKE ALL ON public.lorani_os_incidence FROM anon;
GRANT SELECT ON public.lorani_os_incidence TO authenticated;

-- La fin contractuelle d'un marché : démarrage + délai + jours d'OS + jours d'arrêt.
CREATE OR REPLACE FUNCTION private.lorani_fin_contractuelle(p_marche uuid)
 RETURNS date
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select case when i.demarrage_le is not null and i.delai_execution_jours is not null
              then i.demarrage_le + i.delai_execution_jours + i.os_jours + i.arret_jours end
  from public.lorani_os_incidence i where i.marche_id = p_marche
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_fin_contractuelle(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_os_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.lorani_marches;
begin
  select * into m from public.lorani_marches where id = new.marche_id;
  if not found then
    raise exception 'Marché inconnu.' using errcode = '23503';
  end if;
  new.client_id := m.client_id;
  new.entite_id := m.entite_id;
  new.projet_id := m.projet_id;
  new.objet := btrim(regexp_replace(new.objet, '\s+', ' ', 'g'));
  new.reserves_entreprise := nullif(btrim(new.reserves_entreprise), '');
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('lorani_os:' || new.marche_id::text, 0));
    select coalesce(max(o.numero), 0) + 1 into new.numero from public.lorani_ordres_service o where o.marche_id = new.marche_id;
  end if;
  if new.nature in ('demarrage', 'arret', 'reprise') then
    new.montant_ht := 0;
    new.delai_jours := 0;
  end if;
  -- l'entreprise a quinze jours pour émettre ses réserves (CCAG-Travaux 2021, art. 3.8.2)
  new.reserves_jusquau := case when new.notifie_le is not null then new.notifie_le + 15 end;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_os_preparer() FROM PUBLIC;

-- Après un OS : la date de démarrage du marché, et l'incidence relue.
CREATE OR REPLACE FUNCTION private.lorani_os_relire()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  m public.lorani_marches;
  i public.lorani_os_incidence;
  v_seuil numeric;
  v_fin date;
begin
  select * into m from public.lorani_marches where id = new.marche_id;
  select * into pr from public.lorani_projets where id = new.projet_id;
  if new.nature = 'demarrage' and new.statut <> 'refuse' then
    update public.lorani_marches set demarrage_le = coalesce(new.notifie_le, new.emis_le) where id = m.id and demarrage_le is distinct from coalesce(new.notifie_le, new.emis_le);
  end if;
  select * into i from public.lorani_os_incidence where marche_id = m.id;
  v_seuil := case when pr.marche_public then 15 else 10 end;
  if new.montant_ht <> 0 and abs(i.part_pct) > v_seuil then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('« %s » : OS cumulés sur %s, %s%s %% du marché initial (%s € HT à date)%s.', left(pr.nom, 40), left(m.titulaire, 40),
                  case when i.part_pct > 0 then '+' else '' end, replace(i.part_pct::text, '.', ','), regexp_replace(trunc(i.montant_a_date)::text, '(\d)(?=(\d{3})+$)', '\1 ', 'g'),
                  case when pr.marche_public then ' : au-delà de 15 %, la modification est à examiner (CCP, art. R2194-8)' else ' : un avenant est à envisager' end), 200),
      jsonb_build_object('projet', new.projet_id, 'marche', m.id, 'os', new.id, 'part_pct', i.part_pct, 'montant_a_date', i.montant_a_date, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('os:marche:%s:montant', m.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  if new.delai_jours <> 0 or new.nature in ('arret', 'reprise') then
    v_fin := private.lorani_fin_contractuelle(m.id);
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('« %s » : OS n° %s (%s), %s%s', left(pr.nom, 40), new.numero, left(m.titulaire, 40),
                  case new.nature when 'arret' then 'arrêt de chantier' when 'reprise' then 'reprise du chantier'
                       else format('%s%s jour%s sur le délai', case when new.delai_jours > 0 then '+' else '' end, new.delai_jours, case when abs(new.delai_jours) > 1 then 's' else '' end) end,
                  case when v_fin is not null then ' ; fin contractuelle le ' || to_char(v_fin, 'DD/MM/YYYY') || '.' else '.' end), 200),
      jsonb_build_object('projet', new.projet_id, 'marche', m.id, 'os', new.id, 'fin_contractuelle', v_fin, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('os:%s:delai', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  perform private.journaliser_module(new.client_id, 'lorani', case when tg_op = 'INSERT' then 'lorani.os_emis' else 'lorani.os_modifie' end, 'lorani_projet', new.projet_id::text,
    jsonb_build_object('os', new.id, 'marche', m.id, 'numero', new.numero, 'nature', new.nature, 'montant_ht', new.montant_ht, 'delai_jours', new.delai_jours,
                       'statut', new.statut, 'part_pct', i.part_pct), new.entite_id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_os_relire() FROM PUBLIC;

-- ——— les réserves ———

CREATE OR REPLACE FUNCTION private.lorani_reserves_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_ouvert boolean;
  v_echeance date;
  v_lot text;
begin
  select * into pr from public.lorani_projets where id = new.projet_id;
  new.client_id := pr.client_id;
  new.entite_id := pr.entite_id;
  new.intitule := btrim(regexp_replace(new.intitule, '\s+', ' ', 'g'));
  new.localisation := nullif(btrim(new.localisation), '');
  new.motif := nullif(btrim(new.motif), '');
  if new.marche_id is not null and new.lot_id is null then
    select m.lot_id into new.lot_id from public.lorani_marches m where m.id = new.marche_id and m.projet_id = new.projet_id;
  end if;
  if new.numero is null then
    perform pg_advisory_xact_lock(hashtextextended('lorani_reserves:' || new.projet_id::text, 0));
    select coalesce(max(r.numero), 0) + 1 into new.numero from public.lorani_reserves r where r.projet_id = new.projet_id;
  end if;
  if new.statut = 'levee' and new.levee_le is null then
    new.levee_le := current_date;
  elsif new.statut <> 'levee' then
    new.levee_le := null;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;

  -- l'échéance « à lever avant » au registre
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_echeance from public.delais d where d.id = new.delai_id;
  if coalesce(v_ouvert, false) and new.statut = 'levee' then
    perform private.clore_delai(new.delai_id, 'tenu', null);
  elsif coalesce(v_ouvert, false) and (new.lever_avant is null or new.lever_avant is distinct from v_echeance or new.statut = 'contestee') then
    perform private.clore_delai(new.delai_id, 'annule', left(case when new.statut = 'contestee' then 'Réserve contestée : ' || coalesce(new.motif, '')
                                                                 else format('Date de levée modifiée : %s.', coalesce(to_char(new.lever_avant, 'DD/MM/YYYY'), 'aucune')) end, 300));
    new.delai_id := null;
    v_ouvert := false;
  end if;
  if not coalesce(v_ouvert, false) and new.statut = 'ouverte' and new.lever_avant is not null and new.lever_avant >= current_date and pr.territoire is not null then
    select l.numero into v_lot from public.lorani_lots l where l.id = new.lot_id;
    begin
      new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
        left(format('Réserve n° %s%s : %s', new.numero, coalesce(' (lot ' || v_lot || ')', ''), new.intitule), 200), new.lever_avant,
        left(format('Réserve constatée le %s (%s)%s.', to_char(new.constatee_le, 'DD/MM/YYYY'),
                    case new.origine when 'reception' then 'réception' when 'opr' then 'opérations préalables à la réception' else 'garantie de parfait achèvement' end,
                    coalesce(', ' || new.localisation, '')), 300),
        pr.territoire, array[7, 0], private.lorani_chef_de_projet(new.client_id, new.projet_id),
        'Vérifier la levée avec l''entreprise, puis la constater.',
        format('lorani:reserve:%s:%s', new.id, new.lever_avant));
    exception when others then
      new.delai_id := null;
    end;
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_reserves_preparer() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_reserves_tracer_levee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' or new.statut is distinct from old.statut then
    perform private.journaliser_module(new.client_id, 'lorani', case when tg_op = 'INSERT' then 'lorani.reserve_constatee' else 'lorani.reserve_' || new.statut end,
      'lorani_projet', new.projet_id::text,
      jsonb_build_object('reserve', new.id, 'numero', new.numero, 'lot', new.lot_id, 'intitule', new.intitule, 'statut', new.statut, 'levee_le', new.levee_le, 'motif', new.motif), new.entite_id);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_reserves_tracer_levee() FROM PUBLIC;

-- La réception datée : l'échéance « fin de la GPA ».
CREATE OR REPLACE FUNCTION private.lorani_projet_reception()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ouvert boolean;
  v_fin date := (new.reception_le + interval '1 year')::date;
begin
  if new.reception_le is not distinct from old.reception_le then
    return new;
  end if;
  select (d.statut in ('ouvert', 'depasse')) into v_ouvert from public.delais d where d.id = new.gpa_delai_id;
  if coalesce(v_ouvert, false) then
    perform private.clore_delai(new.gpa_delai_id, 'annule', left(format('Date de réception modifiée : %s.', coalesce(to_char(new.reception_le, 'DD/MM/YYYY'), 'aucune')), 300));
    new.gpa_delai_id := null;
  end if;
  if new.reception_le is not null and v_fin >= current_date and new.territoire is not null then
    begin
      new.gpa_delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.id::text,
        left(format('Fin de la garantie de parfait achèvement : %s', new.nom), 200), v_fin,
        left(format('Réception le %s ; garantie de parfait achèvement d''un an (C. civ., art. 1792-6).', to_char(new.reception_le, 'DD/MM/YYYY')), 300),
        new.territoire, array[60, 30, 7, 0], private.lorani_chef_de_projet(new.client_id, new.id),
        'Faire lever les réserves restantes ; à défaut, mise en demeure et opposition à la libération de la retenue de garantie.',
        format('lorani:gpa:%s:%s', new.id, v_fin));
    exception when others then
      new.gpa_delai_id := null;
    end;
  end if;
  perform private.journaliser_module(new.client_id, 'lorani', 'lorani.reception', 'lorani_projet', new.id::text,
    jsonb_build_object('reception_le', new.reception_le, 'fin_gpa', case when new.reception_le is not null then v_fin end), new.entite_id);
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_projet_reception() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_preparer') then
    create trigger lorani_ordres_service_preparer before insert or update on public.lorani_ordres_service
      for each row execute function private.lorani_os_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_relire') then
    create trigger lorani_ordres_service_relire after insert or update of montant_ht, delai_jours, statut, nature, notifie_le, emis_le on public.lorani_ordres_service
      for each row execute function private.lorani_os_relire();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_ordres_service'::regclass and tgname = 'lorani_ordres_service_tracer') then
    create trigger lorani_ordres_service_tracer after insert or update on public.lorani_ordres_service
      for each row execute function private.tracer('+marche_id', '+numero', '+nature', '+montant_ht', '+delai_jours', '+statut');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_preparer') then
    create trigger lorani_reserves_preparer before insert or update on public.lorani_reserves
      for each row execute function private.lorani_reserves_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_journal') then
    create trigger lorani_reserves_journal after insert or update on public.lorani_reserves
      for each row execute function private.lorani_reserves_tracer_levee();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_reserves'::regclass and tgname = 'lorani_reserves_tracer') then
    create trigger lorani_reserves_tracer after insert or update on public.lorani_reserves
      for each row execute function private.tracer('+numero', '+lot_id', '+statut', '+lever_avant', '+levee_le');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_projets'::regclass and tgname = 'lorani_projets_reception') then
    create trigger lorani_projets_reception before update of reception_le on public.lorani_projets
      for each row execute function private.lorani_projet_reception();
  end if;
end $$;

-- ——— les rappels : réserve à lever, fin de la GPA ———

insert into private.abonnements (evenement, module, genre)
select 'delai.proche.lorani', 'lorani', 'lorani.chantier.rappel'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.proche.lorani' and a.module = 'lorani' and a.genre = 'lorani.chantier.rappel');
insert into private.abonnements (evenement, module, genre)
select 'delai.depasse.lorani', 'lorani', 'lorani.chantier.depasse'
where not exists (select 1 from private.abonnements a where a.evenement = 'delai.depasse.lorani' and a.module = 'lorani' and a.genre = 'lorani.chantier.depasse');

CREATE OR REPLACE FUNCTION private.lorani_chantier_rappeler(t public.travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.lorani_reserves;
  pr public.lorani_projets;
  v_delai uuid := (t.charge ->> 'delai')::uuid;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
  v_depasse boolean := t.genre = 'lorani.chantier.depasse';
  v_ouvertes integer;
  v_detail text;
  v_lot text;
begin
  select * into r from public.lorani_reserves where delai_id = v_delai;
  if found then
    if r.statut <> 'ouverte' then
      return jsonb_build_object('ignore', 'réserve levée ou contestée', 'reserve', r.id);
    end if;
    select * into pr from public.lorani_projets where id = r.projet_id;
    select l.numero into v_lot from public.lorani_lots l where l.id = r.lot_id;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(case when v_depasse
        then format('« %s » : réserve n° %s%s non levée au %s — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'), r.intitule)
        else format('« %s » : réserve n° %s%s à lever avant le %s (%s) — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'),
                    case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end, r.intitule) end, 200),
      jsonb_build_object('projet', r.projet_id, 'reserve', r.id, 'lien', private.lorani_lien_projet(r.projet_id)),
      case when v_depasse then format('reserve:%s:retard', r.id) else format('reserve:%s:rappel:%s', r.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(r.client_id, r.projet_id));
    return jsonb_build_object('reserve', r.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into pr from public.lorani_projets where gpa_delai_id = v_delai;
  if not found then
    return jsonb_build_object('ignore', 'délai hors du chantier');
  end if;
  select string_agg(case when x.numero is null then format('sans lot : %s', x.n) else format('lot %s : %s', x.numero, x.n) end, ', ' order by x.numero nulls last)
    into v_detail
  from (select l.numero, count(*) as n from public.lorani_reserves rr left join public.lorani_lots l on l.id = rr.lot_id
        where rr.projet_id = pr.id and rr.statut = 'ouverte' group by l.numero) x;
  select coalesce(sum(n), 0) into v_ouvertes from (select count(*) as n from public.lorani_reserves rr where rr.projet_id = pr.id and rr.statut = 'ouverte') y;
  perform private.lever_alerte_module(pr.client_id, 'lorani', case when v_ouvertes > 0 then 'attention' else 'info' end,
    left(format('« %s » : %s le %s ; %s', left(pr.nom, 40),
                case when v_depasse then 'la garantie de parfait achèvement a pris fin' else 'fin de la garantie de parfait achèvement' end,
                to_char((pr.reception_le + interval '1 year')::date, 'DD/MM/YYYY'),
                case when v_ouvertes = 0 then 'toutes les réserves sont levées, la retenue de garantie peut être libérée.'
                     else format('%s réserve%s non levée%s (%s) : retenue de garantie à conserver par opposition motivée.', v_ouvertes,
                                 case when v_ouvertes > 1 then 's' else '' end, case when v_ouvertes > 1 then 's' else '' end, v_detail) end), 200),
    jsonb_build_object('projet', pr.id, 'reception_le', pr.reception_le, 'reserves_ouvertes', v_ouvertes, 'lien', private.lorani_lien_projet(pr.id)),
    case when v_depasse then format('gpa:%s:fin', pr.id) else format('gpa:%s:rappel:%s', pr.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(pr.client_id, pr.id));
  return jsonb_build_object('projet', pr.id, 'genre', t.genre, 'reserves_ouvertes', v_ouvertes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_chantier_rappeler(public.travaux) FROM PUBLIC;

-- Le passage des lectures (corps de b5_18) prend aussi les rappels du chantier.
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
