-- 20261018154346 b5_34_revision_bt
-- Source : dépôt : a25beb8 omega/modules/lorani/migrations/b5_34_revision_bt.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b5_34_revision_bt.sql @ a25beb8.
-- ═══ omega/modules/lorani/migrations/b5_34_revision_bt.sql @ a25beb8
-- LORANI, lot B5-34 — la révision des prix par les index BT et TP (18/10/2026).
--
-- Pourquoi : la page des architectes promet « Marché, avenants et révision BT » (Fonctionnement.tsx:802 ; chiffrage,
-- ligne 31 : C). Les index du bâtiment et des travaux publics sont publiés chaque mois par l'INSEE ; l'API « séries
-- BDM » (https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/<idbank>) répond sans clé (vérifié le 18/10, réponse
-- SDMX-ML, une balise <Obs TIME_PERIOD="2026-08" OBS_VALUE="139.4" OBS_QUAL="DEF"/> par mois).
--
-- Ce qui est posé :
--   · public.lorani_ref_index_series : les séries suivies (idbank INSEE, code, libellé, dernière demande) ; BT01
--     (001710986, tous corps d'état) et TP01 (001711007, index général TP) d'emblée. public.lorani_ajouter_index(idbank)
--     ajoute une autre série (BT02, BT16b…) : neuf chiffres, son libellé vient de l'INSEE au premier relevé.
--   · public.lorani_ref_index : les valeurs mensuelles (idbank, mois, valeur, qualité DEF ou provisoire, publiée le).
--     Référentiel commun, en lecture pour les membres.
--   · private.lorani_index_poser(idbank, statut_http, contenu) : lit la réponse SDMX (testable sans réseau).
--   · private.lorani_index_passage() : chaque heure (cron lorani-index), demande les séries des marchés révisables
--     (pg_net, une fois par jour et par série) et relève les réponses arrivées.
--   · lorani_marches.revision_idbank, revision_mois_zero, revision_partie_fixe : la formule du marché,
--     C = a + (1 − a) × In / I0 (a, la partie fixe, 0,15 par défaut ; I0, l'index du mois zéro ; In, celui du mois des
--     travaux de la situation).
--   · lorani_situations.revision jsonb : à chaque situation, In, I0, le coefficient (arrondi au dix-millième), le
--     montant de la période (cumul moins le cumul retenu de la précédente) et la révision HT. Un index du mois pas
--     encore publié : le dernier publié est pris, la révision est dite « provisoire ». Recalculée à la réception de la
--     situation, quand la formule du marché change, et quand un nouvel index arrive.
-- Rien n'est versé d'office : la révision est un montant à vérifier sur la situation. Idempotent ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_ref_index_series (
  idbank text NOT NULL,
  code text NOT NULL,
  libelle text,
  demande bigint,
  demande_le timestamptz,
  releve_le timestamptz,
  erreur text,
  cree_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_ref_index_series_pkey PRIMARY KEY (idbank),
  CONSTRAINT lorani_ref_index_series_idbank_check CHECK (idbank ~ '^[0-9]{9}$'),
  CONSTRAINT lorani_ref_index_series_code_check CHECK (char_length(btrim(code)) BETWEEN 1 AND 20)
);
CREATE TABLE IF NOT EXISTS public.lorani_ref_index (
  idbank text NOT NULL,
  mois date NOT NULL,
  valeur numeric(10,2) NOT NULL,
  qualite text,
  publie_le date,
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_ref_index_pkey PRIMARY KEY (idbank, mois),
  CONSTRAINT lorani_ref_index_serie_fkey FOREIGN KEY (idbank) REFERENCES public.lorani_ref_index_series (idbank),
  CONSTRAINT lorani_ref_index_mois_check CHECK (extract(day from mois) = 1),
  CONSTRAINT lorani_ref_index_valeur_check CHECK (valeur > 0)
);
ALTER TABLE public.lorani_ref_index_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lorani_ref_index ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lorani_ref_index_series, public.lorani_ref_index FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lorani_ref_index_series, public.lorani_ref_index TO authenticated;
DO $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_ref_index_series' and policyname = 'lorani_ref_index_series_lire') then
    create policy lorani_ref_index_series_lire on public.lorani_ref_index_series for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_ref_index' and policyname = 'lorani_ref_index_lire') then
    create policy lorani_ref_index_lire on public.lorani_ref_index for select to authenticated using (true);
  end if;
end $$;
INSERT INTO public.lorani_ref_index_series (idbank, code, libelle) VALUES
  ('001710986', 'BT01', 'Index du bâtiment - BT01 - Tous corps d''état - Base 2010'),
  ('001711007', 'TP01', 'Index Travaux Publics - TP01 - Index général tous travaux - Base 2010')
ON CONFLICT (idbank) DO NOTHING;

ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS revision_idbank text;
ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS revision_mois_zero date;
ALTER TABLE public.lorani_marches ADD COLUMN IF NOT EXISTS revision_partie_fixe numeric(4,3) NOT NULL DEFAULT 0.15;
ALTER TABLE public.lorani_situations ADD COLUMN IF NOT EXISTS revision jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_revision_serie_fkey') then
    alter table public.lorani_marches add constraint lorani_marches_revision_serie_fkey FOREIGN KEY (revision_idbank) REFERENCES public.lorani_ref_index_series (idbank);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lorani_marches_revision_check') then
    alter table public.lorani_marches add constraint lorani_marches_revision_check CHECK (
      (revision_idbank IS NULL OR revision_mois_zero IS NOT NULL)
      AND (revision_mois_zero IS NULL OR extract(day from revision_mois_zero) = 1)
      AND revision_partie_fixe >= 0 AND revision_partie_fixe < 1);
  end if;
end $$;

-- Ajouter une série INSEE à suivre (BT02, BT16b…) : son libellé arrive au premier relevé.
CREATE OR REPLACE FUNCTION public.lorani_ajouter_index(p_idbank text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id text := btrim(coalesce(p_idbank, ''));
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if (select auth.uid()) is null or not exists (select 1 from public.comptes c where c.user_id = (select auth.uid()) and c.role <> 'lecteur') then
    raise exception 'Réservé aux membres qui écrivent.' using errcode = '42501';
  end if;
  if v_id !~ '^[0-9]{9}$' then
    raise exception 'L''identifiant INSEE d''une série a neuf chiffres (idbank, « 001710986 » pour le BT01).' using errcode = '22023';
  end if;
  if char_length(v_code) not between 1 and 20 then
    raise exception 'Donnez le code de l''index (« BT02 »).' using errcode = '22023';
  end if;
  insert into public.lorani_ref_index_series (idbank, code) values (v_id, v_code) on conflict (idbank) do nothing;
  return jsonb_build_object('idbank', v_id, 'code', (select code from public.lorani_ref_index_series where idbank = v_id));
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_ajouter_index(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_ajouter_index(text, text) TO authenticated;

-- La révision d'une situation.
CREATE OR REPLACE FUNCTION private.lorani_situation_revision(p_situation uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.lorani_situations;
  m public.lorani_marches;
  sr public.lorani_ref_index_series;
  v_prec numeric;
  v_i0 numeric;
  i record;
  v_c numeric;
  v_periode numeric;
  v jsonb;
begin
  select * into s from public.lorani_situations where id = p_situation;
  if not found then
    return null;
  end if;
  select * into m from public.lorani_marches where id = s.marche_id;
  if m.revision_idbank is null then
    v := '{}'::jsonb;
  else
    select * into sr from public.lorani_ref_index_series where idbank = m.revision_idbank;
    select coalesce(p.cumul_admis_ht, p.cumul_ht) into v_prec from public.lorani_situations p
    where p.marche_id = s.marche_id and p.numero < s.numero order by p.numero desc limit 1;
    v_periode := s.cumul_ht - coalesce(v_prec, 0);
    select x.valeur into v_i0 from public.lorani_ref_index x where x.idbank = m.revision_idbank and x.mois = m.revision_mois_zero;
    select x.mois, x.valeur, x.qualite into i from public.lorani_ref_index x
    where x.idbank = m.revision_idbank and x.mois <= date_trunc('month', s.mois)::date order by x.mois desc limit 1;
    if v_i0 is null or i.valeur is null then
      v := jsonb_build_object('index', sr.code, 'idbank', m.revision_idbank, 'mois_zero', m.revision_mois_zero, 'i0', v_i0,
                              'mois', date_trunc('month', s.mois)::date, 'montant_periode', v_periode,
                              'manque', case when v_i0 is null then 'l''index du mois zéro n''est pas encore relevé' else 'aucun index relevé pour ce mois' end);
    else
      v_c := round(m.revision_partie_fixe + (1 - m.revision_partie_fixe) * i.valeur / v_i0, 4);
      v := jsonb_build_object('index', sr.code, 'idbank', m.revision_idbank, 'partie_fixe', m.revision_partie_fixe,
                              'mois_zero', m.revision_mois_zero, 'i0', v_i0,
                              'mois', date_trunc('month', s.mois)::date, 'mois_index', i.mois, 'in', i.valeur,
                              'provisoire', i.mois < date_trunc('month', s.mois)::date or coalesce(i.qualite, 'DEF') <> 'DEF',
                              'coefficient', v_c, 'montant_periode', v_periode, 'revision_ht', round(v_periode * (v_c - 1), 2));
    end if;
  end if;
  update public.lorani_situations set revision = v where id = s.id and revision is distinct from v;
  return v;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situation_revision(uuid) FROM PUBLIC;

-- Une réponse de l'INSEE (SDMX-ML) : les valeurs mensuelles, et les révisions des situations à viser recalculées.
CREATE OR REPLACE FUNCTION private.lorani_index_poser(p_idbank text, p_statut integer, p_contenu text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x xml;
  n integer := 0;
  s record;
begin
  if p_statut is distinct from 200 or p_contenu is null then
    update public.lorani_ref_index_series set demande = null, releve_le = now(),
           erreur = format('INSEE : %s', coalesce(p_statut::text, 'pas de réponse')) where idbank = p_idbank;
    return 0;
  end if;
  begin
    x := xmlparse(document p_contenu);
  exception when others then
    update public.lorani_ref_index_series set demande = null, releve_le = now(), erreur = 'INSEE : réponse illisible' where idbank = p_idbank;
    return 0;
  end;
  for s in
    select (xpath('/Obs/@TIME_PERIOD', ob))[1]::text as periode, (xpath('/Obs/@OBS_VALUE', ob))[1]::text as valeur,
           (xpath('/Obs/@OBS_QUAL', ob))[1]::text as qualite, (xpath('/Obs/@DATE_JO', ob))[1]::text as jo
    from unnest(xpath('//Series/Obs', x)) ob
  loop
    if s.periode ~ '^\d{4}-\d{2}$' and s.valeur ~ '^\d+(\.\d+)?$' then
      insert into public.lorani_ref_index (idbank, mois, valeur, qualite, publie_le)
      values (p_idbank, (s.periode || '-01')::date, s.valeur::numeric, s.qualite, case when s.jo ~ '^\d{4}-\d{2}-\d{2}$' then s.jo::date end)
      on conflict (idbank, mois) do update set valeur = excluded.valeur, qualite = excluded.qualite, publie_le = excluded.publie_le, maj_le = now()
        where (lorani_ref_index.valeur, lorani_ref_index.qualite) is distinct from (excluded.valeur, excluded.qualite);
      n := n + 1;
    end if;
  end loop;
  update public.lorani_ref_index_series
     set demande = null, releve_le = now(), erreur = case when n = 0 then 'INSEE : aucune valeur' end,
         libelle = coalesce((xpath('//Series/@TITLE_FR', x))[1]::text, libelle)
   where idbank = p_idbank;
  for s in
    select si.id from public.lorani_situations si join public.lorani_marches m on m.id = si.marche_id
    where m.revision_idbank = p_idbank and si.statut = 'a_viser'
  loop
    perform private.lorani_situation_revision(s.id);
  end loop;
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_index_poser(text, integer, text) FROM PUBLIC;

-- Chaque heure : relever les réponses arrivées, demander les séries utilisées qui n'ont pas été relevées depuis un jour.
CREATE OR REPLACE FUNCTION private.lorani_index_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sr record;
  r record;
  v_debut date;
  n_releves integer := 0;
  n_demandes integer := 0;
begin
  for sr in select * from public.lorani_ref_index_series where demande is not null loop
    select h.status_code, h.content, h.timed_out into r from net._http_response h where h.id = sr.demande;
    if found then
      perform private.lorani_index_poser(sr.idbank, case when r.timed_out then null else r.status_code end, r.content);
      n_releves := n_releves + 1;
    elsif sr.demande_le < now() - interval '1 hour' then
      perform private.lorani_index_poser(sr.idbank, null, null);
    end if;
  end loop;
  for sr in
    select x.idbank, min(m.revision_mois_zero) as depuis from public.lorani_ref_index_series x
    join public.lorani_marches m on m.revision_idbank = x.idbank and m.actif
    where x.demande is null and (x.releve_le is null or x.releve_le < now() - interval '1 day')
    group by x.idbank
  loop
    v_debut := least(sr.depuis, (date_trunc('month', current_date) - interval '24 months')::date);
    update public.lorani_ref_index_series
       set demande = net.http_get(url := 'https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/' || sr.idbank,
                                  params := jsonb_build_object('startPeriod', to_char(v_debut, 'YYYY-MM')),
                                  headers := '{"Accept": "application/xml"}'::jsonb, timeout_milliseconds := 30000),
           demande_le = now()
     where idbank = sr.idbank;
    n_demandes := n_demandes + 1;
  end loop;
  return jsonb_build_object('releves', n_releves, 'demandes', n_demandes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_index_passage() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_situations_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.lorani_situation_revision(new.id);
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situations_revision() FROM PUBLIC;

-- La formule du marché change : ses situations à viser sont recalculées.
CREATE OR REPLACE FUNCTION private.lorani_marches_revision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
begin
  for s in select si.id from public.lorani_situations si where si.marche_id = new.id and si.statut = 'a_viser' loop
    perform private.lorani_situation_revision(s.id);
  end loop;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_marches_revision() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_revision') then
    create trigger lorani_situations_revision after insert or update of cumul_ht, cumul_admis_ht, mois on public.lorani_situations
      for each row execute function private.lorani_situations_revision();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_marches'::regclass and tgname = 'lorani_marches_revision') then
    create trigger lorani_marches_revision after update of revision_idbank, revision_mois_zero, revision_partie_fixe on public.lorani_marches
      for each row execute function private.lorani_marches_revision();
  end if;
end $$;

select cron.schedule('lorani-index', '23 * * * *', $cron$select private.lorani_index_passage()$cron$);
