-- LORANI, lot B5-12 — les honoraires phase par phase : le temps passé contre les honoraires de chaque élément de
-- mission (vague 3, manque n° 2).
--
-- Pourquoi : la page des architectes promet « Lorani suit-il les honoraires de l'agence ? Oui, phase par phase : le
-- temps passé est rapporté aux honoraires de chaque élément de mission, de l'esquisse à la réception. Une phase qui
-- consomme plus que prévu remonte avant la fin de la mission. » Rien ne le portait. Les honoraires d'architecte se
-- découpent par élément de mission (référentiel de la loi MOP, décret n° 93-1268, repris au code de la commande
-- publique : ESQ, APS, APD, PRO, ACT, VISA, DET, AOR…) et s'appellent à l'achèvement de chaque élément. Sources et
-- raisonnement : omega/NOTES-B5.md, « Vague 3 ».
--
-- Ce qui est posé (même dessin que les autres tables Lorani : droits par private.lorani_voit_projet /
-- private.lorani_ecrit_projet, héritage de l'organisation et de l'entité par private.lorani_heriter_projet, journal
-- par private.tracer) :
--   · public.lorani_honoraires : un élément de mission d'un projet (élément, intitulé libre pour « autre »,
--     honoraires HT, heures prévues, statut a_venir | en_cours | achevee | facturee, dates d'achèvement et de
--     facturation). Lu par qui voit le projet ; écrit par qui écrit sur le projet. Pas de retrait : un élément
--     abandonné se met à 0 € et 0 h.
--   · public.lorani_temps : une saisie de temps (un membre, un jour, un élément, des heures, une note). Chacun saisit
--     et corrige SES temps sur un projet qu'il voit (un assistant en lecture seule aussi : il travaille sur le
--     projet) ; une saisie se corrige, elle ne s'efface pas (0 h l'annule). Le projet est celui de l'élément ; pas de
--     temps daté dans le futur.
--   · Surveillance (trigger après saisie) : la première saisie passe l'élément « en_cours » ; le cumul franchit 80 %
--     puis 100 % des heures prévues → alerte « attention » au chef de projet, une seule fois par seuil
--     (clés honoraires:<élément>:80 et :100), avec les heures, l'écart et le taux horaire réalisé.
--   · Achèvement (trigger) : un élément qui passe « achevee » prend sa date d'achèvement et lève l'alerte « appel
--     d'honoraires à émettre » (montant HT) ; journal lorani.element_acheve.
--   · public.lorani_honoraires_projet(p_projet) → jsonb : le tableau de bord du projet, lu sous la RLS de
--     l'appelant (éléments, heures passées, consommation, taux réalisé, état ok | a_surveiller | depasse, totaux).
-- Clés étrangères sans effacement en cascade : un projet qui porte des honoraires ou des temps ne s'efface pas (il
-- s'archive par « actif », comme les autres). Les fonctions nouvelles de private sont fermées au public, sauf le libellé d'un élément (pur, sans donnée). Migration idempotente (create … if not exists,
-- create or replace, garde sur les politiques et les triggers) ; rien n'est retiré.

CREATE TABLE IF NOT EXISTS public.lorani_honoraires (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  element text NOT NULL,
  intitule text,
  montant_ht numeric(12,2) NOT NULL DEFAULT 0,
  heures_prevues numeric(8,1) NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'a_venir',
  achevee_le date,
  facturee_le date,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_honoraires_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_honoraires_client_id_id_key UNIQUE (client_id, id),
  CONSTRAINT lorani_honoraires_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_honoraires_element_check CHECK (element = ANY (ARRAY['diag', 'esq', 'aps', 'apd', 'pc', 'pro', 'dce', 'act', 'visa', 'exe', 'det', 'opc', 'aor', 'autre'])),
  CONSTRAINT lorani_honoraires_intitule_check CHECK (intitule IS NULL OR char_length(btrim(intitule)) BETWEEN 1 AND 120),
  CONSTRAINT lorani_honoraires_autre_nomme CHECK (element <> 'autre' OR intitule IS NOT NULL),
  CONSTRAINT lorani_honoraires_montant_check CHECK (montant_ht >= 0 AND montant_ht <= 100000000),
  CONSTRAINT lorani_honoraires_heures_check CHECK (heures_prevues >= 0 AND heures_prevues <= 100000),
  CONSTRAINT lorani_honoraires_statut_check CHECK (statut = ANY (ARRAY['a_venir', 'en_cours', 'achevee', 'facturee'])),
  CONSTRAINT lorani_honoraires_facturee_apres CHECK (facturee_le IS NULL OR achevee_le IS NULL OR facturee_le >= achevee_le),
  CONSTRAINT lorani_honoraires_une_fois UNIQUE NULLS NOT DISTINCT (projet_id, element, intitule)
);
ALTER TABLE public.lorani_honoraires ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lorani_temps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  projet_id uuid NOT NULL,
  honoraire_id uuid NOT NULL,
  membre uuid NOT NULL DEFAULT auth.uid(),
  jour date NOT NULL DEFAULT current_date,
  heures numeric(4,2) NOT NULL,
  note text,
  cree_le timestamptz NOT NULL DEFAULT now(),
  maj_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lorani_temps_pkey PRIMARY KEY (id),
  CONSTRAINT lorani_temps_honoraire_fkey FOREIGN KEY (client_id, honoraire_id) REFERENCES public.lorani_honoraires (client_id, id),
  CONSTRAINT lorani_temps_projet_fkey FOREIGN KEY (client_id, projet_id) REFERENCES public.lorani_projets (client_id, id),
  CONSTRAINT lorani_temps_heures_check CHECK (heures >= 0 AND heures <= 24),
  CONSTRAINT lorani_temps_note_check CHECK (note IS NULL OR char_length(note) <= 300)
);
CREATE INDEX IF NOT EXISTS lorani_temps_honoraire_idx ON public.lorani_temps (honoraire_id);
CREATE INDEX IF NOT EXISTS lorani_temps_projet_jour_idx ON public.lorani_temps (projet_id, jour);
ALTER TABLE public.lorani_temps ENABLE ROW LEVEL SECURITY;

-- Les privilèges par défaut de Supabase donnent tout à authenticated et anon : on retire tout, puis on rend lire,
-- ajouter et modifier (b5_13b, test 51).
REVOKE ALL ON TABLE public.lorani_honoraires, public.lorani_temps FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.lorani_honoraires TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lorani_temps TO authenticated;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_honoraires' and policyname = 'on voit les honoraires des projets qu''on voit') then
    create policy "on voit les honoraires des projets qu'on voit" on public.lorani_honoraires for select to authenticated
      using (private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_honoraires' and policyname = 'qui ecrit sur le projet ajoute un element de mission') then
    create policy "qui ecrit sur le projet ajoute un element de mission" on public.lorani_honoraires for insert to authenticated
      with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_honoraires' and policyname = 'qui ecrit sur le projet modifie un element de mission') then
    create policy "qui ecrit sur le projet modifie un element de mission" on public.lorani_honoraires for update to authenticated
      using (private.lorani_ecrit_projet(client_id, entite_id, projet_id))
      with check (private.lorani_ecrit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_temps' and policyname = 'on voit les temps des projets qu''on voit') then
    create policy "on voit les temps des projets qu'on voit" on public.lorani_temps for select to authenticated
      using (private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_temps' and policyname = 'chacun saisit ses temps sur un projet qu''il voit') then
    create policy "chacun saisit ses temps sur un projet qu'il voit" on public.lorani_temps for insert to authenticated
      with check (membre = (select auth.uid()) and private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lorani_temps' and policyname = 'chacun corrige ses temps') then
    create policy "chacun corrige ses temps" on public.lorani_temps for update to authenticated
      using (membre = (select auth.uid()) and private.lorani_voit_projet(client_id, entite_id, projet_id))
      with check (membre = (select auth.uid()) and private.lorani_voit_projet(client_id, entite_id, projet_id));
  end if;
end $$;

-- Une saisie de temps prend le projet de son élément ; pas de temps daté dans le futur.
CREATE OR REPLACE FUNCTION private.lorani_temps_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  h public.lorani_honoraires;
begin
  select * into h from public.lorani_honoraires where id = new.honoraire_id;
  if not found then
    raise exception 'Élément de mission inconnu.' using errcode = '23503';
  end if;
  new.client_id := h.client_id;
  new.projet_id := h.projet_id;
  if new.jour > current_date then
    raise exception 'Un temps ne se saisit pas à l''avance (%).', to_char(new.jour, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  new.note := nullif(btrim(new.note), '');
  if tg_op = 'UPDATE' then
    if new.membre is distinct from old.membre then
      raise exception 'Une saisie de temps reste à celui qui l''a faite.' using errcode = '42501';
    end if;
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_temps_preparer() FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_honoraires_preparer()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.intitule := nullif(btrim(new.intitule), '');
  if new.statut in ('achevee', 'facturee') and new.achevee_le is null then
    new.achevee_le := current_date;
  end if;
  if new.statut = 'facturee' and new.facturee_le is null then
    new.facturee_le := current_date;
  end if;
  if new.statut in ('a_venir', 'en_cours') then
    new.achevee_le := null;
    new.facturee_le := null;
  end if;
  if tg_op = 'UPDATE' then
    new.maj_le := now();
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_honoraires_preparer() FROM PUBLIC;

-- Le libellé d'un élément de mission.
CREATE OR REPLACE FUNCTION private.lorani_libelle_element(p_element text, p_intitule text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(p_intitule, case p_element
    when 'diag' then 'Diagnostic' when 'esq' then 'Esquisse' when 'aps' then 'Avant-projet sommaire'
    when 'apd' then 'Avant-projet définitif' when 'pc' then 'Dossier de permis' when 'pro' then 'Projet'
    when 'dce' then 'Dossier de consultation' when 'act' then 'Assistance aux contrats de travaux' when 'visa' then 'Visa'
    when 'exe' then 'Études d''exécution' when 'det' then 'Direction de l''exécution des travaux'
    when 'opc' then 'Ordonnancement, pilotage, coordination' when 'aor' then 'Assistance aux opérations de réception'
    else 'Élément de mission' end)
$function$;
-- Pure et sans donnée : le tableau de bord (lu sous les droits de l'appelant) s'en sert.
GRANT EXECUTE ON FUNCTION private.lorani_libelle_element(text, text) TO authenticated;

-- Des heures à la française : « 33,5 », « 34 », « 7,25 ».
CREATE OR REPLACE FUNCTION private.lorani_heures(p numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select replace(rtrim(to_char(p, 'FM99999990.99'), '.'), '.', ',')
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_heures(numeric) FROM PUBLIC;

-- Après une saisie : l'élément passe en cours, et les seuils de 80 % et 100 % des heures prévues lèvent une alerte.
CREATE OR REPLACE FUNCTION private.lorani_temps_surveiller()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  h public.lorani_honoraires;
  pr public.lorani_projets;
  v_total numeric;
  v_seuil integer;
  v_taux text;
begin
  select * into h from public.lorani_honoraires where id = new.honoraire_id;
  if h.statut = 'a_venir' and new.heures > 0 then
    update public.lorani_honoraires set statut = 'en_cours' where id = h.id;
  end if;
  if h.heures_prevues <= 0 then
    return null;
  end if;
  select coalesce(sum(t.heures), 0) into v_total from public.lorani_temps t where t.honoraire_id = h.id;
  v_seuil := case when v_total >= h.heures_prevues then 100 when v_total >= 0.8 * h.heures_prevues then 80 end;
  if v_seuil is null then
    return null;
  end if;
  select * into pr from public.lorani_projets where id = h.projet_id;
  v_taux := case when v_total > 0 and h.montant_ht > 0
                 then translate(to_char(round(h.montant_ht / v_total), 'FM999G999G990'), ',', ' ') || ' € HT de l''heure' end;
  perform private.lever_alerte_module(h.client_id, 'lorani', 'attention',
    left(case when v_seuil = 100
      then format('« %s » : %s a consommé %s h pour %s h prévues (+%s h). Les honoraires de la phase sont dépassés%s.',
                  left(pr.nom, 60), private.lorani_libelle_element(h.element, h.intitule), private.lorani_heures(v_total),
                  private.lorani_heures(h.heures_prevues), private.lorani_heures(v_total - h.heures_prevues),
                  coalesce(' ; taux réalisé ' || v_taux, ''))
      else format('« %s » : %s a consommé %s h sur %s h prévues (%s %%), avant la fin de la phase.',
                  left(pr.nom, 60), private.lorani_libelle_element(h.element, h.intitule), private.lorani_heures(v_total),
                  private.lorani_heures(h.heures_prevues), round(100 * v_total / h.heures_prevues)) end, 200),
    jsonb_build_object('projet', h.projet_id, 'element', h.id, 'heures', v_total, 'heures_prevues', h.heures_prevues,
                       'montant_ht', h.montant_ht, 'seuil', v_seuil, 'lien', private.lorani_lien_projet(h.projet_id)),
    format('honoraires:%s:%s', h.id, v_seuil), true, private.lorani_chef_de_projet(h.client_id, h.projet_id));
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_temps_surveiller() FROM PUBLIC;

-- Un élément achevé : l'appel d'honoraires est à émettre.
CREATE OR REPLACE FUNCTION private.lorani_honoraires_achever()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
begin
  if new.statut = 'achevee' and (tg_op = 'INSERT' or old.statut is distinct from 'achevee') then
    select * into pr from public.lorani_projets where id = new.projet_id;
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('« %s » : élément « %s » achevé le %s. Appel d''honoraires à émettre : %s € HT.', left(pr.nom, 60),
                  private.lorani_libelle_element(new.element, new.intitule), to_char(new.achevee_le, 'DD/MM/YYYY'),
                  translate(to_char(new.montant_ht, 'FM999G999G990D00'), ',.', ' ,')), 200),
      jsonb_build_object('projet', new.projet_id, 'element', new.id, 'montant_ht', new.montant_ht,
                         'lien', private.lorani_lien_projet(new.projet_id)),
      format('honoraires:%s:appel', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
    perform private.journaliser_module(new.client_id, 'lorani', 'lorani.element_acheve', 'lorani_projet', new.projet_id::text,
      jsonb_build_object('element', new.element, 'intitule', new.intitule, 'montant_ht', new.montant_ht, 'achevee_le', new.achevee_le),
      new.entite_id);
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_honoraires_achever() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_honoraires'::regclass and tgname = 'lorani_honoraires_heriter_projet') then
    create trigger lorani_honoraires_heriter_projet before insert or update of projet_id, entite_id on public.lorani_honoraires
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_honoraires'::regclass and tgname = 'lorani_honoraires_preparer') then
    create trigger lorani_honoraires_preparer before insert or update on public.lorani_honoraires
      for each row execute function private.lorani_honoraires_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_honoraires'::regclass and tgname = 'lorani_honoraires_achever') then
    create trigger lorani_honoraires_achever after insert or update of statut on public.lorani_honoraires
      for each row execute function private.lorani_honoraires_achever();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_honoraires'::regclass and tgname = 'lorani_honoraires_tracer') then
    create trigger lorani_honoraires_tracer after insert or update on public.lorani_honoraires
      for each row execute function private.tracer('+projet_id', '+element', '+montant_ht', '+heures_prevues', '+statut');
  end if;
  -- « a_preparer » avant « heriter » (ordre alphabétique des triggers BEFORE) : le projet vient de l'élément.
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_temps'::regclass and tgname = 'lorani_temps_a_preparer') then
    create trigger lorani_temps_a_preparer before insert or update on public.lorani_temps
      for each row execute function private.lorani_temps_preparer();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_temps'::regclass and tgname = 'lorani_temps_heriter_projet') then
    create trigger lorani_temps_heriter_projet before insert or update of projet_id, entite_id on public.lorani_temps
      for each row execute function private.lorani_heriter_projet();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_temps'::regclass and tgname = 'lorani_temps_surveiller') then
    create trigger lorani_temps_surveiller after insert or update of heures, honoraire_id on public.lorani_temps
      for each row execute function private.lorani_temps_surveiller();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_temps'::regclass and tgname = 'lorani_temps_tracer') then
    create trigger lorani_temps_tracer after insert or update on public.lorani_temps
      for each row execute function private.tracer('+projet_id', '+honoraire_id', '+membre', '+jour', '+heures');
  end if;
end $$;

-- Le tableau de bord des honoraires d'un projet, lu sous la RLS de l'appelant.
CREATE OR REPLACE FUNCTION public.lorani_honoraires_projet(p_projet uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with e as (
    select h.*, coalesce((select sum(t.heures) from public.lorani_temps t where t.honoraire_id = h.id), 0) as heures_passees
    from public.lorani_honoraires h
    where h.projet_id = p_projet
  ), l as (
    select e.*,
           case when e.heures_prevues > 0 then round(100 * e.heures_passees / e.heures_prevues) end as consommation,
           case when e.heures_passees > 0 and e.montant_ht > 0 then round(e.montant_ht / e.heures_passees, 2) end as taux_realise,
           case when e.heures_prevues > 0 and e.heures_passees >= e.heures_prevues then 'depasse'
                when e.heures_prevues > 0 and e.heures_passees >= 0.8 * e.heures_prevues then 'a_surveiller'
                else 'ok' end as etat,
           array_position(array['diag', 'esq', 'aps', 'apd', 'pc', 'pro', 'dce', 'act', 'visa', 'exe', 'det', 'opc', 'aor', 'autre'], e.element) as rang
    from e
  )
  select jsonb_build_object(
    'projet', p_projet,
    'elements', coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'element', l.element, 'libelle', private.lorani_libelle_element(l.element, l.intitule),
        'montant_ht', l.montant_ht, 'heures_prevues', l.heures_prevues, 'heures_passees', l.heures_passees,
        'consommation', l.consommation, 'taux_realise', l.taux_realise, 'etat', l.etat, 'statut', l.statut,
        'achevee_le', l.achevee_le, 'facturee_le', l.facturee_le) order by l.rang, l.intitule), '[]'::jsonb),
    'montant_ht', coalesce(sum(l.montant_ht), 0),
    'montant_acheve_ht', coalesce(sum(l.montant_ht) filter (where l.statut in ('achevee', 'facturee')), 0),
    'montant_facture_ht', coalesce(sum(l.montant_ht) filter (where l.statut = 'facturee'), 0),
    'heures_prevues', coalesce(sum(l.heures_prevues), 0),
    'heures_passees', coalesce(sum(l.heures_passees), 0),
    'depasses', count(*) filter (where l.etat = 'depasse'))
  from l
$function$;
GRANT EXECUTE ON FUNCTION public.lorani_honoraires_projet(uuid) TO authenticated;
