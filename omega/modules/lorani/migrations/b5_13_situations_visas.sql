-- LORANI, lot B5-13 — le chantier : les situations de travaux comparées au marché, les visas datés (vague 3, manque n° 3).
--
-- Pourquoi : la page des architectes promet « Lorani compare chaque situation reçue au marché et à la précédente, puis
-- chiffre l'écart » et « La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage ». Rien ne le
-- portait. Règles reprises (sources : omega/NOTES-B5.md, « Vague 3 », n° 3) :
--   · marché public : le maître d'œuvre accepte ou rectifie le projet de décompte mensuel dans les SEPT jours de sa
--     réception (CCAG-Travaux 2021, art. 12.2.2) ; il vise les documents d'exécution dans les QUINZE jours (art. 29) ;
--   · marché privé : délai de vérification de 15 jours par défaut, à régler sur le marché (NF P 03-001 ou contrat) ;
--   · retenue de garantie : 5 % au plus (loi n° 71-584 du 16 juillet 1971).
--
-- Ce qui est posé (droits et héritage comme les autres tables Lorani) :
--   · public.lorani_marches : le marché d'un lot (titulaire, montant HT, avenants HT, retenue de garantie ≤ 5 %, délai
--     de vérification des situations : 7 jours si le projet est un marché public, 15 sinon, modifiable).
--   · public.lorani_situations : la situation n° k d'un marché (mois, cumul HT demandé, reçue le, « à viser avant »
--     calculé, statut a_viser | visee | rectifiee, cumul admis, observation). Contrôles à la réception : le cumul
--     dépasse le marché et ses avenants → alerte « attention » avec l'écart chiffré ; le cumul baisse par rapport à la
--     situation précédente → alerte ; numéro déjà pris → refus. Toute situation reçue → alerte « à viser avant le … ».
--   · public.lorani_visas : un document d'exécution à viser (lot, document, indice, reçu le, date de commande de
--     l'ouvrage, délai de visa 15 jours par défaut) ; « à viser avant » = le plus tôt entre reçu + délai et la veille
--     ouvrée de la date de commande ; avis a_viser | vso | vao | ref (visé sans observation, avec observations,
--     refusé). Un visa qui laisse moins de cinq jours → alerte « attention ».
--   · public.lorani_chantier_projet(p_projet) → jsonb : le tableau du chantier sous la RLS de l'appelant (marchés,
--     cumul admis, avancement, montant de la dernière période, retenue, situations et visas à rendre, en retard).
-- Clés étrangères sans effacement en cascade (un projet s'archive par « actif »). Fonctions nouvelles de private
-- fermées au public. Migration idempotente ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_marches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid NOT NULL,
  titulaire text NOT NULL,
  intervenant_id uuid,
  montant_ht numeric(14,2) NOT NULL,
  avenants_ht numeric(14,2) NOT NULL DEFAULT 0,
  retenue_pct numeric(4,2) NOT NULL DEFAULT 5,
  delai_verification_jours smallint,
  actif boolean NOT NULL DEFAULT true,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_marches_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_marches_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_marches_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_marches_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_marches_titulaire_check CHECK (char_length(btrim(titulaire)) BETWEEN 1 AND 160),
  CONSTRAINT lorani_marches_montant_check CHECK (montant_ht > 0 AND montant_ht <= 1000000000),
  CONSTRAINT lorani_marches_avenants_check CHECK (avenants_ht > -1000000000 AND avenants_ht <= 1000000000 AND montant_ht + avenants_ht > 0),
  CONSTRAINT lorani_marches_retenue_check CHECK (retenue_pct >= 0 AND retenue_pct <= 5),
  CONSTRAINT lorani_marches_delai_check CHECK (delai_verification_jours BETWEEN 1 AND 60),
  CONSTRAINT lorani_marches_une_fois UNIQUE (lot_id, titulaire)
);
ALTER TABLE public.lorani_marches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_situations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  marche_id uuid NOT NULL,
  numero smallint NOT NULL,
  mois date NOT NULL,
  cumul_ht numeric(14,2) NOT NULL,
  recue_le date NOT NULL DEFAULT current_date,
  a_viser_avant date,
  statut text NOT NULL DEFAULT 'a_viser',
  cumul_admis_ht numeric(14,2),
  observation text,
  visee_le date,
  visee_par uuid,
  piece_id uuid,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_situations_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_situations_marche_fkey FOREIGN KEY (client_id, marche_id) REFERENCES public.lorani_marches (client_id, id),
  CONSTRAINT lorani_situations_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_situations_numero_check CHECK (numero BETWEEN 1 AND 999),
  CONSTRAINT lorani_situations_cumul_check CHECK (cumul_ht >= 0 AND cumul_ht <= 1000000000),
  CONSTRAINT lorani_situations_admis_check CHECK (cumul_admis_ht IS NULL OR (cumul_admis_ht >= 0 AND cumul_admis_ht <= 1000000000)),
  CONSTRAINT lorani_situations_statut_check CHECK (statut = ANY (ARRAY['a_viser', 'visee', 'rectifiee'])),
  CONSTRAINT lorani_situations_visee_complete CHECK (statut = 'a_viser' OR (cumul_admis_ht IS NOT NULL AND visee_le IS NOT NULL)),
  CONSTRAINT lorani_situations_rectif_motivee CHECK (statut <> 'rectifiee' OR char_length(btrim(coalesce(observation, ''))) >= 3),
  CONSTRAINT lorani_situations_observation_check CHECK (observation IS NULL OR char_length(observation) <= 1000),
  CONSTRAINT lorani_situations_une_fois UNIQUE (marche_id, numero)
);
CREATE INDEX IF NOT EXISTS lorani_situations_projet_idx ON public.lorani_situations (projet_id, statut);
ALTER TABLE public.lorani_situations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_visas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  lot_id uuid,
  document text NOT NULL,
  indice text NOT NULL DEFAULT 'A',
  recu_le date NOT NULL DEFAULT current_date,
  commande_le date,
  delai_visa_jours smallint NOT NULL DEFAULT 15,
  a_viser_avant date,
  avis text NOT NULL DEFAULT 'a_viser',
  observation text,
  vise_le date,
  vise_par uuid,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_visas_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_visas_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_visas_lot_fkey FOREIGN KEY (client_id, projet_id, lot_id) REFERENCES public.lorani_lots (client_id, projet_id, id),
  CONSTRAINT lorani_visas_document_check CHECK (char_length(btrim(document)) BETWEEN 1 AND 200),
  CONSTRAINT lorani_visas_indice_check CHECK (indice ~ '^[0-9A-Za-z.-]{1,6}$'),
  CONSTRAINT lorani_visas_delai_check CHECK (delai_visa_jours BETWEEN 1 AND 90),
  CONSTRAINT lorani_visas_commande_check CHECK (commande_le IS NULL OR commande_le >= recu_le),
  CONSTRAINT lorani_visas_avis_check CHECK (avis = ANY (ARRAY['a_viser', 'vso', 'vao', 'ref'])),
  CONSTRAINT lorani_visas_rendu_complet CHECK (avis = 'a_viser' OR vise_le IS NOT NULL),
  CONSTRAINT lorani_visas_observation_motivee CHECK (avis NOT IN ('vao', 'ref') OR char_length(btrim(coalesce(observation, ''))) >= 3),
  CONSTRAINT lorani_visas_observation_check CHECK (observation IS NULL OR char_length(observation) <= 1000),
  CONSTRAINT lorani_visas_une_fois UNIQUE NULLS NOT DISTINCT (projet_id, lot_id, document, indice)
);
CREATE INDEX IF NOT EXISTS lorani_visas_projet_idx ON public.lorani_visas (projet_id, avis);
ALTER TABLE public.lorani_visas ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.lorani_marches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lorani_situations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lorani_visas TO authenticated;

DO $$
declare
  t text;
begin
  foreach t in array array['lorani_marches', 'lorani_situations', 'lorani_visas'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit le chantier des projets qu''on voit') then
      execute format('create policy %I on public.%I for select to authenticated using (private.lorani_voit_projet(client_id, entite_id, projet_id))',
                     'on voit le chantier des projets qu''on voit', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet ajoute au chantier') then
      execute format('create policy %I on public.%I for insert to authenticated with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet ajoute au chantier', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'qui ecrit sur le projet tient le chantier') then
      execute format('create policy %I on public.%I for update to authenticated using (private.lorani_ecrit_projet(client_id, entite_id, projet_id)) with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id))',
                     'qui ecrit sur le projet tient le chantier', t);
    end if;
  end loop;
end $$;

-- Des euros à la française : « 12 480,00 € ».
CREATE OR REPLACE FUNCTION private.lorani_euros(p numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select translate(to_char(p, 'FM999G999G999G990D00'), ',.', ' ,') || ' €'
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_euros(numeric) FROM PUBLIC;

-- Le marché : titulaire épuré, délai de vérification selon la nature du projet.
CREATE OR REPLACE FUNCTION private.lorani_marches_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.titulaire := btrim(regexp_replace(new.titulaire, '\s+', ' ', 'g'));
  if new.delai_verification_jours is null then
    new.delai_verification_jours := case when (select pr.marche_public from public.lorani_projets pr where pr.id = new.projet_id) then 7 else 15 end;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_marches_preparer() FROM PUBLIC;

-- La situation : le projet vient du marché ; « à viser avant » ; le visa se date.
CREATE OR REPLACE FUNCTION private.lorani_situations_preparer()
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
  new.projet_id := m.projet_id;
  new.mois := date_trunc('month', new.mois)::date;
  new.observation := nullif(btrim(new.observation), '');
  new.a_viser_avant := new.recue_le + m.delai_verification_jours;
  if new.statut = 'visee' and new.cumul_admis_ht is null then
    new.cumul_admis_ht := new.cumul_ht;
  end if;
  if new.statut in ('visee', 'rectifiee') then
    new.visee_le := coalesce(new.visee_le, current_date);
    new.visee_par := coalesce(new.visee_par, (select auth.uid()));
  else
    new.visee_le := null;
    new.visee_par := null;
    new.cumul_admis_ht := null;
  end if;
  if tg_op = 'UPDATE' then
    if new.marche_id is distinct from old.marche_id or new.numero is distinct from old.numero then
      raise exception 'Une situation reste attachée à son marché et à son numéro.' using errcode = '55000';
    end if;
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situations_preparer() FROM PUBLIC;

-- À la réception d'une situation : la comparer au marché et à la précédente, et dire jusqu'à quand la viser.
CREATE OR REPLACE FUNCTION private.lorani_situations_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  m public.lorani_marches;
  pr public.lorani_projets;
  l public.lorani_lots;
  v_prec numeric;
  v_total numeric;
  v_qui text;
  v_dest uuid;
begin
  select * into m from public.lorani_marches where id = new.marche_id;
  select * into pr from public.lorani_projets where id = new.projet_id;
  select * into l from public.lorani_lots where id = m.lot_id;
  v_total := m.montant_ht + m.avenants_ht;
  v_qui := format('« %s » : situation n° %s de %s (lot %s)', left(pr.nom, 50), new.numero, left(m.titulaire, 50), l.numero);
  v_dest := private.lorani_chef_de_projet(new.client_id, new.projet_id);
  select coalesce(s.cumul_admis_ht, s.cumul_ht) into v_prec
  from public.lorani_situations s
  where s.marche_id = new.marche_id and s.numero < new.numero
  order by s.numero desc limit 1;

  perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
    left(format('%s reçue : %s HT cumulés, %s ce mois. À viser avant le %s.', v_qui, private.lorani_euros(new.cumul_ht),
                private.lorani_euros(new.cumul_ht - coalesce(v_prec, 0)), to_char(new.a_viser_avant, 'DD/MM/YYYY')), 200),
    jsonb_build_object('projet', new.projet_id, 'situation', new.id, 'marche', m.id, 'a_viser_avant', new.a_viser_avant,
                       'lien', private.lorani_lien_projet(new.projet_id)),
    format('situation:%s:recue', new.id), true, v_dest);

  if new.cumul_ht > v_total then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('%s : le cumul (%s HT) dépasse le marché et ses avenants (%s HT) de %s.', v_qui, private.lorani_euros(new.cumul_ht),
                  private.lorani_euros(v_total), private.lorani_euros(new.cumul_ht - v_total)), 200),
      jsonb_build_object('projet', new.projet_id, 'situation', new.id, 'marche', m.id, 'ecart', new.cumul_ht - v_total,
                         'lien', private.lorani_lien_projet(new.projet_id)),
      format('situation:%s:depasse', new.id), true, v_dest);
  end if;
  if v_prec is not null and new.cumul_ht < v_prec then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('%s : le cumul (%s HT) est inférieur à celui de la situation précédente (%s HT).', v_qui,
                  private.lorani_euros(new.cumul_ht), private.lorani_euros(v_prec)), 200),
      jsonb_build_object('projet', new.projet_id, 'situation', new.id, 'marche', m.id, 'precedent', v_prec,
                         'lien', private.lorani_lien_projet(new.projet_id)),
      format('situation:%s:baisse', new.id), true, v_dest);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_situations_controler() FROM PUBLIC;

-- La veille ouvrée d'une date (samedi et dimanche sautés).
CREATE OR REPLACE FUNCTION private.lorani_veille_ouvree(p date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case extract(isodow from p - 1) when 7 then p - 3 when 6 then p - 2 else p - 1 end
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_veille_ouvree(date) FROM PUBLIC;

-- Le visa : « à viser avant » calé sur le délai de visa et sur la date de commande de l'ouvrage.
CREATE OR REPLACE FUNCTION private.lorani_visas_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  new.document := btrim(regexp_replace(new.document, '\s+', ' ', 'g'));
  new.indice := upper(btrim(new.indice));
  new.observation := nullif(btrim(new.observation), '');
  new.a_viser_avant := case when new.commande_le is null then new.recu_le + new.delai_visa_jours
                            else greatest(new.recu_le, least(new.recu_le + new.delai_visa_jours, private.lorani_veille_ouvree(new.commande_le))) end;
  if new.avis <> 'a_viser' then
    new.vise_le := coalesce(new.vise_le, current_date);
    new.vise_par := coalesce(new.vise_par, (select auth.uid()));
  else
    new.vise_le := null;
    new.vise_par := null;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_visas_preparer() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_visas_controler()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
begin
  if new.avis = 'a_viser' and new.a_viser_avant - greatest(new.recu_le, current_date) < 5
     and (tg_op = 'INSERT' or new.a_viser_avant is distinct from old.a_viser_avant) then
    select * into pr from public.lorani_projets where id = new.projet_id;
    perform private.lever_alerte_module(new.client_id, 'lorani', 'attention',
      left(format('« %s » : visa urgent, %s (indice %s) à viser avant le %s%s.', left(pr.nom, 50), left(new.document, 70), new.indice,
                  to_char(new.a_viser_avant, 'DD/MM/YYYY'),
                  case when new.commande_le is not null then ', l''ouvrage se commande le ' || to_char(new.commande_le, 'DD/MM/YYYY') else '' end), 200),
      jsonb_build_object('projet', new.projet_id, 'visa', new.id, 'a_viser_avant', new.a_viser_avant, 'commande_le', new.commande_le,
                         'lien', private.lorani_lien_projet(new.projet_id)),
      format('visa:%s:urgent', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_visas_controler() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_marches'::regclass and tgname = 'lorani_marches_heriter_projet') then
    create trigger lorani_marches_heriter_projet before insert or update of projet_id, entite_id on public.lorani_marches
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_marches'::regclass and tgname = 'lorani_marches_preparer') then
    create trigger lorani_marches_preparer before insert or update on public.lorani_marches
      for each row execute function private.lorani_marches_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_marches'::regclass and tgname = 'lorani_marches_tracer') then
    create trigger lorani_marches_tracer after insert or update on public.lorani_marches
      for each row execute function private.tracer('+projet_id', '+lot_id', '+titulaire', '+montant_ht', '+avenants_ht', '+retenue_pct');
  end if;
  -- « a_preparer » avant « heriter » : le projet vient du marché.
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_a_preparer') then
    create trigger lorani_situations_a_preparer before insert or update on public.lorani_situations
      for each row execute function private.lorani_situations_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_heriter_projet') then
    create trigger lorani_situations_heriter_projet before insert or update of projet_id, entite_id on public.lorani_situations
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_controler') then
    create trigger lorani_situations_controler after insert on public.lorani_situations
      for each row execute function private.lorani_situations_controler();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_situations'::regclass and tgname = 'lorani_situations_tracer') then
    create trigger lorani_situations_tracer after insert or update on public.lorani_situations
      for each row execute function private.tracer('+projet_id', '+marche_id', '+numero', '+cumul_ht', '+statut', '+cumul_admis_ht');
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_visas'::regclass and tgname = 'lorani_visas_heriter_projet') then
    create trigger lorani_visas_heriter_projet before insert or update of projet_id, entite_id on public.lorani_visas
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_visas'::regclass and tgname = 'lorani_visas_preparer') then
    create trigger lorani_visas_preparer before insert or update on public.lorani_visas
      for each row execute function private.lorani_visas_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_visas'::regclass and tgname = 'lorani_visas_controler') then
    create trigger lorani_visas_controler after insert or update of recu_le, commande_le, delai_visa_jours on public.lorani_visas
      for each row execute function private.lorani_visas_controler();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_visas'::regclass and tgname = 'lorani_visas_tracer') then
    create trigger lorani_visas_tracer after insert or update on public.lorani_visas
      for each row execute function private.tracer('+projet_id', '+lot_id', '+document', '+indice', '+avis');
  end if;
end $$;

-- Le tableau du chantier d'un projet, lu sous la RLS de l'appelant.
CREATE OR REPLACE FUNCTION public.lorani_chantier_projet(p_projet uuid, p_aujourdhui date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with j as (select coalesce(p_aujourdhui, current_date) as jour),
  s as (
    select x.*, coalesce(x.cumul_admis_ht, x.cumul_ht) as cumul_retenu,
           coalesce(x.cumul_admis_ht, x.cumul_ht)
             - coalesce(lag(coalesce(x.cumul_admis_ht, x.cumul_ht)) over (partition by x.marche_id order by x.numero), 0) as periode_ht
    from public.lorani_situations x where x.projet_id = p_projet
  ), m as (
    select mm.*, l.numero as lot_numero, l.intitule as lot_intitule, mm.montant_ht + mm.avenants_ht as total_ht,
           d.numero as d_numero, coalesce(d.cumul_retenu, 0) as d_cumul, d.periode_ht as d_periode
    from public.lorani_marches mm
    join public.lorani_lots l on l.id = mm.lot_id
    left join lateral (select s2.numero, s2.cumul_retenu, s2.periode_ht from s s2 where s2.marche_id = mm.id
                       order by s2.numero desc limit 1) d on true
    where mm.projet_id = p_projet and mm.actif
  )
  select jsonb_build_object(
    'projet', p_projet,
    'marches', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'lot', m.lot_numero, 'lot_intitule', m.lot_intitule, 'titulaire', m.titulaire,
        'montant_ht', m.montant_ht, 'avenants_ht', m.avenants_ht, 'total_ht', m.total_ht, 'retenue_pct', m.retenue_pct,
        'cumul_ht', m.d_cumul,
        'avancement', round(100 * m.d_cumul / m.total_ht),
        'derniere_situation', m.d_numero, 'periode_ht', m.d_periode,
        'retenue_periode_ht', round(coalesce(m.d_periode, 0) * m.retenue_pct / 100, 2),
        'reste_ht', m.total_ht - m.d_cumul) order by m.lot_numero, m.titulaire) from m), '[]'::jsonb),
    'situations_a_viser', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'marche', s.marche_id, 'numero', s.numero, 'mois', s.mois, 'cumul_ht', s.cumul_ht, 'periode_ht', s.periode_ht,
        'a_viser_avant', s.a_viser_avant, 'en_retard', s.a_viser_avant < (select jour from j)) order by s.a_viser_avant)
      from s where s.statut = 'a_viser'), '[]'::jsonb),
    'visas_a_rendre', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'document', v.document, 'indice', v.indice, 'recu_le', v.recu_le, 'commande_le', v.commande_le,
        'a_viser_avant', v.a_viser_avant, 'en_retard', v.a_viser_avant < (select jour from j)) order by v.a_viser_avant)
      from public.lorani_visas v where v.projet_id = p_projet and v.avis = 'a_viser'), '[]'::jsonb),
    'marches_ht', coalesce((select sum(m.total_ht) from m), 0),
    'cumul_ht', coalesce((select sum(m.d_cumul) from m), 0))
$function$;
GRANT EXECUTE ON FUNCTION public.lorani_chantier_projet(uuid, date) TO authenticated;
