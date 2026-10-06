-- b6_16 — DALIRO : l'encaissement des situations (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. Daliro facture par situations (b6_12) mais ne sait pas si l'entreprise a été payée. Pour une
-- entreprise du BTP, c'est la trésorerie : à quelle date chaque situation est due, ce qui est rentré, ce qui est en
-- retard, et ce que le retard lui ouvre de droit.
--
-- RÈGLES (Code de commerce, art. L441-10).
--   · Échéance : posée à la validation de la situation, 30 jours plus tard (délai par défaut) ; elle peut être fixée
--     autrement par la porte btp_fixer_echeance, jamais au-delà de 60 jours après la date de la situation validée
--     (plafond légal ; « 45 jours fin de mois » tient dans ces 60 jours).
--   · Paiements : partiels admis ; leur somme ne dépasse pas le net à payer ; date entre la validation et aujourd'hui.
--   · Retard : jours entre l'échéance et le paiement complet (ou aujourd'hui s'il reste dû). Un retard ouvre de plein
--     droit l'indemnité forfaitaire pour frais de recouvrement de 40 € par facture, et des pénalités de retard au taux
--     convenu, ou à défaut au taux de la BCE majoré de 10 points : ce taux change chaque semestre, Omega le pose dans
--     private.reglages (cle « daliro_taux_penalites_retard », en fraction : 0.1215 pour 12,15 %) ; il est recopié
--     sur la situation à sa validation. Elles courent sur chaque somme payée en retard jusqu'à son paiement, et sur
--     le reste dû jusqu'au jour. Sans taux posé, elles ne sont pas chiffrées (le retard et l'indemnité le sont).
--   · Le point du matin (b6_15) porte désormais les situations en retard (« relancez »).
--   · Écriture par les portes seules (bureau qui voit les prix) ; lecture sous RLS (entité + prix). Journal.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; rien n'est retiré
-- ni effacé.

alter table public.btp_situations add column if not exists echeance date;
alter table public.btp_situations add column if not exists penalites_taux numeric(6,4);
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'btp_situations_penalites_taux_check') then
    alter table public.btp_situations add constraint btp_situations_penalites_taux_check check (penalites_taux is null or (penalites_taux >= 0 and penalites_taux <= 1));
  end if;
end $do$;

create table if not exists public.btp_situations_paiements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  situation_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  recu_le date not null,
  montant numeric(14,2) not null,
  reference text,
  note_par uuid,
  cree_le timestamptz not null default now(),
  constraint btp_situations_paiements_client_id_id_key unique (client_id, id),
  constraint btp_situations_paiements_situation_fkey foreign key (client_id, situation_id) references public.btp_situations(client_id, id) on delete cascade,
  constraint btp_situations_paiements_montant_check check (montant > 0),
  constraint btp_situations_paiements_reference_check check (char_length(reference) <= 120)
);
create index if not exists btp_situations_paiements_situation_idx on public.btp_situations_paiements (situation_id, recu_le);
alter table public.btp_situations_paiements enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_situations_paiements' and policyname = 'qui voit les prix lit les paiements des situations') then
    create policy "qui voit les prix lit les paiements des situations" on public.btp_situations_paiements
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id) and private.btp_voit_prix(client_id));
  end if;
end $do$;
revoke all on table public.btp_situations_paiements from anon, authenticated;
grant select on table public.btp_situations_paiements to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_situations_paiements']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- À la validation : l'échéance par défaut (30 jours) et le taux de pénalités en vigueur.
create or replace function private.btp_situation_echeance()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_taux text;
begin
  if new.statut = 'validee' and old.statut is distinct from 'validee' then
    if new.echeance is null then
      new.echeance := (coalesce(new.validee_le, now()) at time zone 'Europe/Paris')::date + 30;
    end if;
    if new.penalites_taux is null then
      select g.valeur into v_taux from private.reglages g where g.cle = 'daliro_taux_penalites_retard';
      if v_taux ~ '^0?\.[0-9]{1,4}$' or v_taux ~ '^1(\.0+)?$' then
        new.penalites_taux := v_taux::numeric;
      end if;
    end if;
  end if;
  return new;
end $function$;
do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'btp_situations_echeance' and tgrelid = 'public.btp_situations'::regclass) then
    create trigger btp_situations_echeance before update on public.btp_situations
      for each row execute function private.btp_situation_echeance();
  end if;
end $do$;
-- Les situations déjà validées reçoivent leur échéance par défaut.
update public.btp_situations set echeance = (validee_le at time zone 'Europe/Paris')::date + 30
where statut = 'validee' and echeance is null and validee_le is not null;

-- Ce qu'une situation a encaissé, ce qui reste, le retard et ce qu'il ouvre (à une date).
create or replace function private.btp_encaissement(p_situation uuid, p_jour date default current_date)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with s as (select * from public.btp_situations where id = p_situation),
       p as (select coalesce(sum(montant), 0) as encaisse, max(recu_le) as dernier from public.btp_situations_paiements where situation_id = p_situation),
       e as (
         select s.*, p.encaisse, greatest(s.net_a_payer - p.encaisse, 0) as reste,
                case when s.net_a_payer - p.encaisse <= 0.005 then p.dernier end as payee_le
         from s, p)
  select jsonb_build_object(
    'echeance', e.echeance, 'encaisse', e.encaisse, 'reste_du', e.reste, 'payee_le', e.payee_le,
    'retard_jours', greatest(coalesce(e.payee_le, p_jour) - e.echeance, 0),
    'etat', case when e.statut <> 'validee' then null
                 when e.payee_le is not null then 'payee'
                 when e.echeance < p_jour then 'en_retard'
                 when e.encaisse > 0 then 'partielle'
                 else 'a_echoir' end,
    'indemnite_forfaitaire', case when e.echeance is not null and coalesce(e.payee_le, p_jour) > e.echeance then 40 else 0 end,
    'penalites_taux', e.penalites_taux,
    -- les pénalités courent sur chaque somme payée en retard (jusqu'à son paiement) et sur le reste dû (jusqu'au jour)
    'penalites', case when e.penalites_taux is null or e.echeance is null then 0
                      else round(e.penalites_taux / 365.0 * (
                             coalesce((select sum(pa.montant * greatest(pa.recu_le - e.echeance, 0)) from public.btp_situations_paiements pa where pa.situation_id = e.id), 0)
                             + e.reste * greatest(p_jour - e.echeance, 0)), 2) end)
  from e
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Fixer l'échéance (plafond légal : 60 jours après la situation validée)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_fixer_echeance(p_situation uuid, p_echeance date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  v_base date;
begin
  select * into s from public.btp_situations where id = p_situation for update;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut <> 'validee' then
    raise exception 'L''échéance se fixe sur une situation validée.' using errcode = '23514';
  end if;
  v_base := (s.validee_le at time zone 'Europe/Paris')::date;
  if p_echeance is null or p_echeance < v_base or p_echeance > v_base + 60 then
    raise exception 'L''échéance est entre le % et le % : 60 jours au plus après la situation (Code de commerce, art. L441-10).',
      to_char(v_base, 'DD/MM/YYYY'), to_char(v_base + 60, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  update public.btp_situations set echeance = p_echeance, maj_le = now() where id = s.id;
  perform private.journaliser(s.client_id, 'daliro.situation_echeance', 'btp_situations', s.id::text,
    jsonb_build_object('avant', s.echeance, 'apres', p_echeance), s.entite_id);
  return private.btp_encaissement(s.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Noter un paiement reçu
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_noter_paiement(p_situation uuid, p_montant numeric, p_date date default current_date, p_reference text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  v_encaisse numeric(14,2);
  v_e jsonb;
begin
  select * into s from public.btp_situations where id = p_situation for update;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut <> 'validee' then
    raise exception 'Un paiement se note sur une situation validée.' using errcode = '23514';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Le montant reçu est positif.' using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date or p_date < (s.validee_le at time zone 'Europe/Paris')::date then
    raise exception 'La date du paiement est entre la validation de la situation et aujourd''hui.' using errcode = '22023';
  end if;
  select coalesce(sum(montant), 0) into v_encaisse from public.btp_situations_paiements where situation_id = s.id;
  if v_encaisse + round(p_montant, 2) > s.net_a_payer + 0.005 then
    raise exception 'Ce paiement dépasse le reste dû (% €).', to_char(s.net_a_payer - v_encaisse, 'FM999999990.00') using errcode = '23514';
  end if;
  insert into public.btp_situations_paiements (client_id, situation_id, chantier_id, entite_id, recu_le, montant, reference, note_par)
  values (s.client_id, s.id, s.chantier_id, s.entite_id, p_date, round(p_montant, 2), left(nullif(btrim(p_reference), ''), 120), (select auth.uid()));
  v_e := private.btp_encaissement(s.id);
  perform private.journaliser(s.client_id, case when v_e ->> 'etat' = 'payee' then 'daliro.situation_payee' else 'daliro.situation_paiement' end,
    'btp_situations', s.id::text,
    jsonb_build_object('montant', round(p_montant, 2), 'recu_le', p_date, 'reference', p_reference, 'reste_du', v_e -> 'reste_du',
                       'retard_jours', v_e -> 'retard_jours'), s.entite_id);
  return v_e;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin (b6_15) : plus les situations en retard
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 0. Les situations en retard de paiement (b6_16) : relancez.
  for r in
    select s.id, s.numero, s.chantier_id, c.nom as chantier_nom, private.btp_encaissement(s.id, p_jour) as e
    from public.btp_situations s join public.btp_chantiers c on c.id = s.chantier_id
    where s.client_id = p_client and s.statut = 'validee' and s.echeance < p_jour
    order by s.echeance, c.nom, s.numero
  loop
    continue when r.e ->> 'etat' <> 'en_retard';
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : situation n° %s impayée depuis %s jour%s, reste dû %s € (indemnité de 40 € due) : relancez', r.chantier_nom, r.numero,
                           r.e ->> 'retard_jours', case when (r.e ->> 'retard_jours')::int > 1 then 's' else '' end,
                           translate(to_char((r.e ->> 'reste_du')::numeric, 'FM999,999,990.00'), ',.', ' ,')), 300),
      'gravite', case when (r.e ->> 'retard_jours')::int >= 30 then 'critique' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

-- Le tableau du chantier : b6_14, plus l'encaissement de chaque situation.
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.id), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id),
        -- b6_07 : la dernière demande J-2 partie pour ce passage (envois du socle, sous la RLS du lecteur)
        'envoi', (select jsonb_build_object('id', e.id, 'canal', e.canal, 'mode', e.mode, 'statut', e.statut, 'verrou', e.verrou,
                                            'cree_le', e.cree_le, 'envoye_le', e.envoye_le, 'remise', e.remise, 'remise_le', e.remise_le,
                                            -- b6_08 : approuvé par l'accord permanent (politique du socle) ?
                                            'accord', (select jsonb_build_object('politique', d.politique_id, 'active_le', p.active_le)
                                                       from public.demandes_validation d join public.politiques p on p.id = d.politique_id
                                                       where d.id = e.demande_id))
                  from public.envois e
                  where e.client_id = p.client_id and e.module = 'daliro' and e.objet_type = 'btp_passages' and e.objet_id = p.id::text
                  order by e.cree_le desc limit 1))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    -- b6_12 : les situations de travaux (lisibles par qui voit les prix ; sinon la RLS rend une liste vide)
    'situations', (select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(l) order by l.ordre, l.designation), '[]'::jsonb)
                   from public.btp_situations_lignes l where l.situation_id = s.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = s.demande_id),
        -- b6_16 : l'encaissement (paiements lisibles sous RLS ; le calcul reprend private.btp_encaissement)
        'paiements', (select coalesce(jsonb_agg(to_jsonb(pa) order by pa.recu_le, pa.cree_le), '[]'::jsonb)
                      from public.btp_situations_paiements pa where pa.situation_id = s.id),
        'encaisse', (select coalesce(sum(pa.montant), 0) from public.btp_situations_paiements pa where pa.situation_id = s.id))
        order by s.numero desc), '[]'::jsonb)
      from public.btp_situations s where s.chantier_id = c.id and s.statut <> 'annulee'),
    -- b6_13 : la réception, ses réserves, la retenue et le décompte (la réception se lit avec le droit de voir les prix)
    'reception', (select to_jsonb(x) || jsonb_build_object(
        'retenue_etat', case when x.retenue_statut = 'bloquee' and current_date >= x.retenue_due_le then 'liberable' else x.retenue_statut end,
        'decompte_echeance', x.date_reception + 45,
        'reserves', (select coalesce(jsonb_agg(to_jsonb(rv) order by rv.ordre), '[]'::jsonb) from public.btp_reserves rv where rv.reception_id = x.id))
      from public.btp_receptions x where x.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;

revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_situation_echeance() from public, anon, authenticated;
revoke execute on function private.btp_encaissement(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_encaissement(uuid, date) to service_role;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
revoke execute on function public.btp_fixer_echeance(uuid, date) from public, anon;
revoke execute on function public.btp_noter_paiement(uuid, numeric, date, text) from public, anon;
grant execute on function public.btp_fixer_echeance(uuid, date) to authenticated, service_role;
grant execute on function public.btp_noter_paiement(uuid, numeric, date, text) to authenticated, service_role;
