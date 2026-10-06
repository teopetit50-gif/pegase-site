-- b1_11 — VARELO : les réserves à émettre — livraison avariée, compte à rebours, lettre de protestation (session B1, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_09 (remplace grp_ce_matin, grp_deposer_points).
--
-- CE QUE ÇA CORRIGE (omega/AUDIT-PROMESSES.md, § 2 Varelo, « réserves à émettre », gros, avec A1). /secteurs/groupes
-- montre « Une livraison reçue avec avarie : le transport, les colis et les photos du constat » et « Le compte à
-- rebours de la réserve : trois jours pour l'adresser au transporteur ». Rien ne le portait. Le scénario et les
-- sources sont dans omega/NOTES-B1.md, « 4. Les réserves à émettre ».
--
-- CE QUI EST POSÉ.
--   · public.regles_delais : quatre règles (le moteur de délais du socle, public.echeance_de, les calcule avec les
--     jours fériés du territoire de la société) — varelo.reserves.routier (C. com., art. L133-3 : 3 jours non compris
--     les jours fériés, dimanches compris parmi eux : mode ouvrables), varelo.reserves.cmr (CMR, art. 30 : 7 jours,
--     dimanches et fériés non compris), varelo.reserves.maritime (La Haye-Visby, art. 3 § 6 : 3 jours),
--     varelo.reserves.aerien (convention de Montréal, art. 31 : 14 jours).
--   · public.grp_receptions : une livraison reçue par une société — date, mode de transport, transporteur, document
--     de transport, expéditeur (objet du référentiel ou libellé), colis attendus et reçus, avarie, manquant, constat,
--     réserves portées sur le bon, montant estimé, pièce (photo, bon) ; la règle, la date limite et le calcul du socle
--     figés à l'enregistrement ; statut a_examiner → protestee (protestation partie, à telle date, par tel moyen) |
--     sans_suite (classée, motivée). Une livraison sans avarie ni manquant est enregistrée sans suite d'office.
--   · vue public.grp_reserves (security_invoker) : jours restants, état (depasse, aujourdhui, demain, a_venir,
--     protestee, protestee_hors_delai, sans_suite).
--   · portes : grp_enregistrer_reception (toute personne de la société sauf lecteur), grp_lettre_reserve (le texte de
--     la protestation motivée, à envoyer en recommandé), grp_noter_protestation et grp_classer_reception (gérant,
--     admin, valideur de la direction des opérations ou juridique).
--   · alertes : « attention » dès l'enregistrement, « critique » la veille et le jour de la date limite, clé
--     varelo:reserve.<réception>, fermées à la protestation ou au classement ; point du matin « Réserves à émettre »
--     au gérant et à la direction des opérations ; journal varelo.reception.enregistree | protestee | classee ;
--     cron varelo-reserves (chaque heure) qui fait passer les alertes en critique.
--
-- Règles de pose : create … if not exists / create or replace ; insert … on conflict do nothing ; jamais de suppression.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les règles de délai
-- ─────────────────────────────────────────────────────────────────────────

insert into public.regles_delais (code, version, libelle, quantite, unite, mode, proroge, source_texte, source_url)
values
  ('varelo.reserves.routier', 1, 'Protestation au transporteur routier pour avarie ou perte partielle', 3, 'jours', 'ouvrables', false,
   'C. com., art. L133-3 : protestation motivée par acte extrajudiciaire ou lettre recommandée dans les trois jours, non compris les jours fériés, qui suivent la réception.',
   'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020899366'),
  ('varelo.reserves.cmr', 1, 'Réserves écrites au transporteur routier international (CMR), dommages non apparents', 7, 'jours', 'ouvrables', false,
   'Convention CMR, art. 30 : réserves écrites dans les sept jours à dater de la livraison, dimanches et jours fériés non compris, pour les pertes ou avaries non apparentes.',
   null),
  ('varelo.reserves.maritime', 1, 'Avis de perte ou dommage au transporteur maritime, dommages non apparents', 3, 'jours', 'calendaires', false,
   'Règles de La Haye-Visby, art. 3, § 6 : avis écrit dans les trois jours de la délivrance quand la perte ou le dommage n''est pas apparent.',
   null),
  ('varelo.reserves.aerien', 1, 'Protestation au transporteur aérien pour avarie', 14, 'jours', 'calendaires', false,
   'Convention de Montréal, art. 31, § 2 : protestation au plus tard dans les quatorze jours de la réception de la marchandise en cas d''avarie.',
   null)
on conflict (code, version) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Table et vue
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_receptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  date_reception date not null,
  mode text not null default 'routier',
  transporteur text not null,
  document_transport text,
  nature text,
  objet_id uuid,
  expediteur text,
  colis_attendus integer,
  colis_recus integer,
  avarie boolean not null default false,
  manquant boolean not null default false,
  constat text,
  reserves_sur_bon text,
  montant_estime numeric(16,2),
  piece_id uuid,
  territoire text,
  regle_code text,
  echeance date,
  calcul jsonb,
  statut text not null default 'a_examiner',
  protestation_le date,
  protestation_moyen text,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint grp_receptions_client_id_id_key unique (client_id, id),
  constraint grp_receptions_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_receptions_objet_fkey foreign key (objet_id, client_id, nature) references public.grp_ref_objets(id, client_id, nature),
  constraint grp_receptions_nature_check check (nature in ('fournisseur')),
  constraint grp_receptions_mode_check check (mode in ('routier', 'cmr', 'maritime', 'aerien')),
  constraint grp_receptions_transporteur_check check (char_length(btrim(transporteur)) between 1 and 200),
  constraint grp_receptions_document_check check (char_length(document_transport) <= 80),
  constraint grp_receptions_expediteur_check check (char_length(expediteur) <= 200),
  constraint grp_receptions_colis_check check (colis_attendus >= 0 and colis_recus >= 0),
  constraint grp_receptions_constat_check check (char_length(constat) <= 2000),
  constraint grp_receptions_reserves_check check (char_length(reserves_sur_bon) <= 1000),
  constraint grp_receptions_montant_check check (montant_estime >= 0),
  constraint grp_receptions_dommage_decrit check (not (avarie or manquant) or char_length(btrim(coalesce(constat, ''))) >= 1),
  constraint grp_receptions_statut_check check (statut in ('a_examiner', 'protestee', 'sans_suite')),
  constraint grp_receptions_protestation check ((statut = 'protestee') = (protestation_le is not null)),
  constraint grp_receptions_moyen_check check (protestation_moyen in ('lrar', 'acte', 'lre', 'courriel', 'portail')),
  constraint grp_receptions_motif_check check (char_length(motif) <= 500)
);
comment on table public.grp_receptions is 'VARELO — une livraison reçue par une société du groupe, avec son avarie ou son manquant, la date limite de la protestation au transporteur (calculée par public.echeance_de) et la suite donnée. Écrite par les portes grp_enregistrer_reception, grp_noter_protestation, grp_classer_reception.';

create index if not exists grp_receptions_client_idx on public.grp_receptions (client_id, statut, echeance);

create or replace trigger grp_receptions_tracer after insert or update on public.grp_receptions
  for each row execute function private.tracer();

alter table public.grp_receptions enable row level security;
revoke all on public.grp_receptions from anon, authenticated;
grant select on public.grp_receptions to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_receptions'
                 and policyname = 'membres lisent les receptions de leur perimetre') then
    create policy "membres lisent les receptions de leur perimetre" on public.grp_receptions
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

create or replace view public.grp_reserves with (security_invoker = true) as
  select r.id, r.client_id, r.entite_id, e.nom as societe, r.date_reception, r.mode, r.transporteur, r.document_transport,
         r.objet_id, o.code_groupe, coalesce(o.nom_groupe, r.expediteur) as expediteur, r.colis_attendus, r.colis_recus,
         r.avarie, r.manquant, r.constat, r.reserves_sur_bon, r.montant_estime, r.piece_id, r.territoire, r.regle_code,
         g.libelle as regle_libelle, g.source_texte as regle_source, r.echeance, (r.echeance - current_date) as jours_restants,
         r.calcul ->> 'detail' as calcul_detail, r.statut, r.protestation_le, r.protestation_moyen, r.motif, r.cree_par, r.cree_le,
         case
           when r.statut = 'sans_suite' then 'sans_suite'
           when r.statut = 'protestee' and r.protestation_le > r.echeance then 'protestee_hors_delai'
           when r.statut = 'protestee' then 'protestee'
           when r.echeance < current_date then 'depasse'
           when r.echeance = current_date then 'aujourdhui'
           when r.echeance = current_date + 1 then 'demain'
           else 'a_venir'
         end as etat
  from public.grp_receptions r
  join public.entites e on e.client_id = r.client_id and e.id = r.entite_id
  left join public.grp_ref_objets o on o.client_id = r.client_id and o.id = r.objet_id
  left join lateral (select x.libelle, x.source_texte from public.regles_delais x where x.code = r.regle_code order by x.version desc limit 1) g on true;
comment on view public.grp_reserves is 'VARELO — les réserves à émettre : chaque livraison avariée ou incomplète avec sa date limite de protestation, les jours restants et l''état.';

revoke all on public.grp_reserves from anon, authenticated;
grant select on public.grp_reserves to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Le contrôle : alertes attention, puis critiques la veille et le jour
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_controler_reserves(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_niveau text;
  v_levees integer := 0;
  v_closes integer := 0;
begin
  perform set_config('omega.module', 'varelo', true);
  for r in select x.* from public.grp_reserves x where x.client_id = p_client and x.statut = 'a_examiner' and x.etat <> 'depasse' loop
    v_niveau := case when r.jours_restants <= 1 then 'critique' else 'attention' end;
    if v_niveau = 'critique' and exists (select 1 from public.alertes a where a.client_id = p_client and a.acquittee_le is null
                                         and a.niveau = 'attention' and a.cle_regroupement = 'varelo:reserve.' || r.id::text) then
      perform private.fermer_alertes_releve(p_client, 'varelo', 'reserve.' || r.id::text, 'la date limite est demain ou aujourd''hui');
    end if;
    if not exists (select 1 from public.alertes a where a.client_id = p_client and a.acquittee_le is null
                   and a.cle_regroupement = 'varelo:reserve.' || r.id::text) then
      if private.lever_alerte_module(p_client, 'varelo', v_niveau,
           left(format('Réserve à adresser à %s avant le %s (%s, livraison du %s)', r.transporteur, to_char(r.echeance, 'DD/MM/YYYY'),
                       r.societe, to_char(r.date_reception, 'DD/MM')), 200),
           jsonb_build_object('reception_id', r.id, 'societe', r.societe, 'transporteur', r.transporteur, 'document', r.document_transport,
                              'echeance', r.echeance, 'regle', r.regle_code, 'montant_estime', r.montant_estime),
           'reserve.' || r.id::text, true) is not null then
        v_levees := v_levees + 1;
      end if;
    end if;
  end loop;
  for r in
    select a.cle_regroupement from public.alertes a
    where a.client_id = p_client and a.acquittee_le is null and a.cle_regroupement like 'varelo:reserve.%'
      and not exists (select 1 from public.grp_reserves x where x.client_id = p_client and x.statut = 'a_examiner' and x.etat <> 'depasse'
                      and 'varelo:reserve.' || x.id::text = a.cle_regroupement)
  loop
    v_closes := v_closes + private.fermer_alertes_releve(p_client, 'varelo', substr(r.cle_regroupement, char_length('varelo:') + 1),
                                                         'la protestation est partie, la livraison est classée ou le délai est passé');
  end loop;
  return jsonb_build_object('alertes_levees', v_levees, 'alertes_closes', v_closes);
end $function$;

create or replace function private.grp_tache_reserves()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c uuid;
  n integer := 0;
begin
  for c in select distinct r.client_id from public.grp_receptions r where r.statut = 'a_examiner' loop
    begin
      perform private.grp_controler_reserves(c);
      n := n + 1;
    exception when others then
      raise warning 'varelo-reserves : client % : %', c, sqlerrm;
    end;
  end loop;
  -- les alertes des livraisons qui ne sont plus à examiner se ferment aussi chez les groupes sans réception ouverte
  for c in select distinct a.client_id from public.alertes a where a.acquittee_le is null and a.cle_regroupement like 'varelo:reserve.%'
           and not exists (select 1 from public.grp_receptions r where r.client_id = a.client_id and r.statut = 'a_examiner') loop
    perform private.grp_controler_reserves(c);
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Les portes
-- ─────────────────────────────────────────────────────────────────────────

-- Champs : date_reception, mode, transporteur, document_transport, objet_id (fournisseur du référentiel) ou expediteur,
-- colis_attendus, colis_recus, avarie, manquant, constat, reserves_sur_bon, montant_estime, piece_id.
create or replace function private.grp_enregistrer_reception(p_client uuid, p_entite uuid, p_champs jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_objet public.grp_ref_objets;
  v_date date;
  v_mode text := coalesce(nullif(f ->> 'mode', ''), 'routier');
  v_territoire text;
  v_calcul jsonb;
  v_avarie boolean;
  v_manquant boolean;
  v_id uuid;
  v_statut text;
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Une livraison s''enregistre par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, p_entite) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = p_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les champs d''une livraison se donnent en objet JSON.' using errcode = '22023';
  end if;
  begin
    v_date := coalesce(nullif(f ->> 'date_reception', '')::date, current_date);
    v_avarie := coalesce((f ->> 'avarie')::boolean, false);
    v_manquant := coalesce((f ->> 'manquant')::boolean, false);
  exception when others then
    raise exception 'Livraison refusée : une date ou une case est illisible (dates au format AAAA-MM-JJ).' using errcode = '22023';
  end;
  if v_date > current_date then
    raise exception 'Une livraison se reçoit aujourd''hui ou avant.' using errcode = '22023';
  end if;
  if v_mode not in ('routier', 'cmr', 'maritime', 'aerien') then
    raise exception 'Mode de transport : routier, cmr, maritime ou aerien (%).', v_mode using errcode = '22023';
  end if;
  if nullif(f ->> 'objet_id', '') is not null then
    begin
      select * into v_objet from public.grp_ref_objets o where o.id = (f ->> 'objet_id')::uuid and o.client_id = p_client;
    exception when invalid_text_representation then
      raise exception 'Identifiant d''objet illisible.' using errcode = '22023';
    end;
    if v_objet.id is null or v_objet.nature <> 'fournisseur' or v_objet.statut <> 'actif' then
      raise exception 'L''expéditeur pris au référentiel est un fournisseur actif du groupe.' using errcode = '22023';
    end if;
  end if;
  v_territoire := coalesce(public.territoire_de_entite(p_client, p_entite), 'metropole');
  v_calcul := public.echeance_de('varelo.reserves.' || v_mode, v_date, v_territoire);
  v_statut := case when v_avarie or v_manquant then 'a_examiner' else 'sans_suite' end;
  perform set_config('omega.module', 'varelo', true);
  begin
    insert into public.grp_receptions (client_id, entite_id, date_reception, mode, transporteur, document_transport, nature, objet_id,
      expediteur, colis_attendus, colis_recus, avarie, manquant, constat, reserves_sur_bon, montant_estime, piece_id, territoire,
      regle_code, echeance, calcul, statut, motif, cree_par)
    values (p_client, p_entite, v_date, v_mode, btrim(coalesce(f ->> 'transporteur', '')), left(nullif(btrim(f ->> 'document_transport'), ''), 80),
      v_objet.nature, v_objet.id, left(nullif(btrim(f ->> 'expediteur'), ''), 200),
      nullif(f ->> 'colis_attendus', '')::integer, nullif(f ->> 'colis_recus', '')::integer, v_avarie, v_manquant,
      nullif(btrim(f ->> 'constat'), ''), nullif(btrim(f ->> 'reserves_sur_bon'), ''), round(nullif(f ->> 'montant_estime', '')::numeric, 2),
      nullif(f ->> 'piece_id', '')::uuid, v_territoire, 'varelo.reserves.' || v_mode, (v_calcul ->> 'echeance')::date, v_calcul, v_statut,
      case when v_statut = 'sans_suite' then 'livraison conforme : ni avarie ni manquant' end, v_uid)
    returning id into v_id;
  exception
    when check_violation then
      raise exception 'Livraison refusée : %', case
        when sqlerrm like '%transporteur%' then 'le transporteur est nommé (1 à 200 caractères).'
        when sqlerrm like '%dommage_decrit%' then 'une avarie ou un manquant se décrit (le constat).'
        when sqlerrm like '%colis%' then 'des nombres de colis positifs.'
        when sqlerrm like '%montant%' then 'un montant estimé positif.'
        else sqlerrm end using errcode = '22023';
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Livraison refusée : un nombre est illisible.' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.reception.enregistree', 'grp_receptions', v_id::text,
    jsonb_build_object('date_reception', v_date, 'mode', v_mode, 'transporteur', btrim(f ->> 'transporteur'), 'avarie', v_avarie,
                       'manquant', v_manquant, 'echeance', v_calcul ->> 'echeance', 'regle', 'varelo.reserves.' || v_mode, 'statut', v_statut), p_entite);
  perform private.grp_controler_reserves(p_client);
  return jsonb_build_object('reception', v_id, 'statut', v_statut, 'echeance', v_calcul ->> 'echeance', 'detail', v_calcul ->> 'detail',
                            'territoire', v_territoire);
end $function$;

-- Le texte de la protestation motivée, à envoyer en recommandé (le site promet « la réserve à adresser »).
create or replace function private.grp_lettre_reserve(p_reception uuid)
 returns text
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
begin
  select x.* into r from public.grp_reserves x where x.id = p_reception;
  if r.id is null then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;
  return format(E'%s\n\nÀ l''attention de %s\n\nObjet : protestation motivée — livraison du %s%s\n\nMadame, Monsieur,\n\n'
    'Nous avons reçu le %s la livraison%s%s. %s\n\n'
    'Constat : %s\n%s%s'
    'Nous vous adressons, par la présente, notre protestation motivée pour %s, et réservons tous nos droits à indemnisation%s.\n\n'
    'Cette protestation vous est notifiée dans le délai prévu : %s (%s).\n\n'
    'Veuillez agréer, Madame, Monsieur, nos salutations distinguées.\n\n%s',
    r.societe, r.transporteur, to_char(r.date_reception, 'DD/MM/YYYY'),
    coalesce(', document de transport n° ' || r.document_transport, ''),
    to_char(r.date_reception, 'DD/MM/YYYY'),
    coalesce(' expédiée par ' || r.expediteur, ''),
    case when r.colis_attendus is not null and r.colis_recus is not null
         then format(' : %s colis annoncés, %s reçus', r.colis_attendus, r.colis_recus) else '' end,
    case when r.reserves_sur_bon is not null then 'Les réserves suivantes ont été portées sur le bon de livraison : « ' || r.reserves_sur_bon || ' ».'
         else 'Aucune réserve n''a pu être portée sur le bon au moment de la livraison.' end,
    coalesce(r.constat, '—'),
    case when r.montant_estime is not null then 'Préjudice estimé à ce jour : ' || private.grp_euros(r.montant_estime) || E' €.\n' else '' end,
    E'Les photographies du constat sont tenues à votre disposition.\n\n',
    case when r.avarie and r.manquant then 'avarie et perte partielle' when r.manquant then 'perte partielle' else 'avarie' end,
    case when r.montant_estime is not null then ', à hauteur du préjudice subi' else '' end,
    coalesce(r.regle_source, ''), coalesce(r.calcul_detail, 'date limite au ' || to_char(r.echeance, 'DD/MM/YYYY')),
    r.societe);
end $function$;

create or replace function private.grp_exiger_decideur_reception(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  if not ((private.a_un_role(p_client, array['gerant', 'admin'])
           or (private.a_un_role(p_client, array['valideur'])
               and exists (select 1 from public.equipes e where e.client_id = p_client and e.cle in ('direction_operations', 'direction_juridique')
                           and private.dans_equipe(v_uid, e.id))))
          and private.voit_entite(p_client, p_entite)) then
    raise exception 'La suite d''une livraison se décide par le gérant, l''administrateur, la direction des opérations ou la direction juridique.' using errcode = '42501';
  end if;
end $function$;

create or replace function private.grp_noter_protestation(p_reception uuid, p_date date default current_date, p_moyen text default 'lrar', p_motif text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.grp_receptions;
begin
  select * into r from public.grp_receptions where id = p_reception;
  if r.id is null or ((select auth.uid()) is not null and r.client_id not in (select private.mes_clients())) then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;
  perform private.grp_exiger_decideur_reception(r.client_id, r.entite_id);
  if r.statut <> 'a_examiner' then
    raise exception 'Cette livraison n''attend plus de protestation (%).', r.statut using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date or p_date < r.date_reception then
    raise exception 'La protestation part entre la réception et aujourd''hui.' using errcode = '22023';
  end if;
  if p_moyen is null or p_moyen not in ('lrar', 'acte', 'lre', 'courriel', 'portail') then
    raise exception 'Moyen : lrar, acte, lre, courriel ou portail (%).', coalesce(p_moyen, 'vide') using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_receptions set statut = 'protestee', protestation_le = p_date, protestation_moyen = p_moyen,
         motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now()
  where id = r.id;
  perform private.grp_journal(r.client_id, 'varelo.reception.protestee', 'grp_receptions', r.id::text,
    jsonb_build_object('date', p_date, 'moyen', p_moyen, 'echeance', r.echeance, 'hors_delai', p_date > r.echeance,
                       'transporteur', r.transporteur), r.entite_id);
  perform private.grp_controler_reserves(r.client_id);
  return jsonb_build_object('reception', r.id, 'hors_delai', p_date > r.echeance, 'echeance', r.echeance,
                            'avertissement', case when p_moyen in ('courriel', 'portail') and r.mode in ('routier')
                              then 'L''art. L133-3 demande un acte extrajudiciaire ou une lettre recommandée : un courriel ou un portail ne suffit pas.' end);
end $function$;

create or replace function private.grp_classer_reception(p_reception uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.grp_receptions;
begin
  select * into r from public.grp_receptions where id = p_reception;
  if r.id is null or ((select auth.uid()) is not null and r.client_id not in (select private.mes_clients())) then
    raise exception 'Livraison introuvable.' using errcode = 'P0002';
  end if;
  perform private.grp_exiger_decideur_reception(r.client_id, r.entite_id);
  if r.statut <> 'a_examiner' then
    raise exception 'Cette livraison est déjà « % ».', r.statut using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) = 0 then
    raise exception 'Classer sans suite dit pourquoi.' using errcode = '22023';
  end if;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_receptions set statut = 'sans_suite', motif = left(btrim(p_motif), 500), maj_le = now() where id = r.id;
  perform private.grp_journal(r.client_id, 'varelo.reception.classee', 'grp_receptions', r.id::text,
    jsonb_build_object('motif', left(btrim(p_motif), 500), 'echeance', r.echeance), r.entite_id);
  perform private.grp_controler_reserves(r.client_id);
end $function$;

create or replace function public.grp_enregistrer_reception(p_client uuid, p_entite uuid, p_champs jsonb)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_enregistrer_reception(p_client, p_entite, p_champs) $function$;
create or replace function public.grp_lettre_reserve(p_reception uuid)
 returns text language sql stable set search_path to ''
as $function$ select private.grp_lettre_reserve(p_reception) $function$;
create or replace function public.grp_noter_protestation(p_reception uuid, p_date date default current_date, p_moyen text default 'lrar', p_motif text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_noter_protestation(p_reception, p_date, p_moyen, p_motif) $function$;
create or replace function public.grp_classer_reception(p_reception uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.grp_classer_reception(p_reception, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Le point du matin : « Réserves à émettre » (remplace grp_ce_matin et grp_deposer_points de b1_09)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_lignes_reserves(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
  v jsonb := '[]'::jsonb;
  n integer := 0;
begin
  for r in select x.* from public.grp_reserves x where x.client_id = p_client and x.statut = 'a_examiner' order by x.echeance, x.societe loop
    exit when n >= 15;
    v := v || jsonb_build_object(
      'texte', left(case
        when r.etat = 'depasse' then format('Délai passé depuis le %s : %s (%s, livraison du %s) — la protestation est désormais tardive',
                                           to_char(r.echeance, 'DD/MM'), r.transporteur, r.societe, to_char(r.date_reception, 'DD/MM'))
        else format('Avant le %s : protestation à %s (%s, livraison du %s%s)', to_char(r.echeance, 'DD/MM'), r.transporteur, r.societe,
                    to_char(r.date_reception, 'DD/MM'), coalesce(', ' || r.expediteur, '')) end, 300),
      'gravite', case when r.etat in ('aujourdhui', 'demain', 'depasse') then 'critique' else 'attention' end,
      'lien', '/espace/varelo', 'objet_type', 'grp_receptions', 'objet_id', r.id::text);
    n := n + 1;
  end loop;
  return v;
end $function$;

create or replace function public.grp_ce_matin(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('groupe', private.grp_lignes_groupe(p_client),
                            'reserves', private.grp_lignes_reserves(p_client),
                            'reportings', private.grp_lignes_reportings(p_client),
                            'contrats', private.grp_lignes_matin(p_client, 'contrats'),
                            'encours', private.grp_lignes_matin(p_client, 'encours'),
                            'reciproques', private.grp_lignes_matin(p_client, 'reciproques'));
end $function$;

create or replace function private.grp_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  s record;
  q record;
  u record;
  v_jour date;
  v_items jsonb;
  n integer := 0;
begin
  for k in
    select i.client_id,
           coalesce((select e.fuseau from public.entites e where e.client_id = i.client_id and e.principale limit 1), 'Europe/Paris') as fuseau
    from public.grp_installations i
    order by i.client_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    begin
      perform set_config('omega.module', 'varelo', true);
      for s in
        select * from (values ('groupe', 'Le groupe ce matin', 5), ('reserves', 'Réserves à émettre', 6), ('reportings', 'Reportings dus', 8),
                              ('contrats', 'Contrats à dénoncer', 10), ('encours', 'Encours du groupe', 20),
                              ('reciproques', 'Réciproques intragroupe', 30)) as t(quoi, titre, ordre)
      loop
        v_items := case s.quoi when 'groupe' then private.grp_lignes_groupe(k.client_id)
                               when 'reserves' then private.grp_lignes_reserves(k.client_id)
                               when 'reportings' then private.grp_lignes_reportings(k.client_id)
                               else private.grp_lignes_matin(k.client_id, s.quoi) end;
        for q in
          select null::uuid as equipe_id, 'gerant'::text as role
          union all
          select e.id, null from public.equipes e
          where e.client_id = k.client_id
            and ((e.cle = 'direction_financiere' and s.quoi not in ('reserves'))
                 or (e.cle = 'direction_juridique' and s.quoi in ('contrats', 'reserves'))
                 or (e.cle = 'presidence' and s.quoi = 'groupe')
                 or (e.cle = 'direction_operations' and s.quoi in ('reportings', 'reserves')))
        loop
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, null, q.equipe_id);
          else
            perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, v_items, null, q.equipe_id,
                                            false, now(), false, s.ordre);
          end if;
        end loop;
      end loop;
      for u in
        select distinct g.responsable_id from public.grp_reportings g
        where g.client_id = k.client_id and g.actif and g.responsable_id is not null
      loop
        v_items := private.grp_lignes_reportings(k.client_id, u.responsable_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', null, null);
        else
          perform private.deposer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', v_items, null, null,
                                          false, now(), false, 7);
        end if;
      end loop;
      perform private.battre(k.client_id, 'varelo_matin', jsonb_build_object('jour', v_jour), interval '1 day');
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'varelo', 'attention',
        'Le point du matin du groupe n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot', false, null);
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Droits d'exécution et passage horaire
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_controler_reserves(uuid) from public, anon, authenticated;
revoke execute on function private.grp_tache_reserves() from public, anon, authenticated;
grant execute on function private.grp_controler_reserves(uuid) to service_role;
grant execute on function private.grp_tache_reserves() to service_role;

revoke execute on function private.grp_enregistrer_reception(uuid, uuid, jsonb) from public, anon;
revoke execute on function private.grp_lettre_reserve(uuid) from public, anon;
revoke execute on function private.grp_exiger_decideur_reception(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.grp_noter_protestation(uuid, date, text, text) from public, anon;
revoke execute on function private.grp_classer_reception(uuid, text) from public, anon;
revoke execute on function private.grp_lignes_reserves(uuid) from public, anon;
grant execute on function private.grp_enregistrer_reception(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function private.grp_lettre_reserve(uuid) to authenticated, service_role;
grant execute on function private.grp_exiger_decideur_reception(uuid, uuid) to service_role;
grant execute on function private.grp_noter_protestation(uuid, date, text, text) to authenticated, service_role;
grant execute on function private.grp_classer_reception(uuid, text) to authenticated, service_role;
grant execute on function private.grp_lignes_reserves(uuid) to authenticated, service_role;

revoke execute on function public.grp_enregistrer_reception(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.grp_lettre_reserve(uuid) from public, anon;
revoke execute on function public.grp_noter_protestation(uuid, date, text, text) from public, anon;
revoke execute on function public.grp_classer_reception(uuid, text) from public, anon;
grant execute on function public.grp_enregistrer_reception(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.grp_lettre_reserve(uuid) to authenticated, service_role;
grant execute on function public.grp_noter_protestation(uuid, date, text, text) to authenticated, service_role;
grant execute on function public.grp_classer_reception(uuid, text) to authenticated, service_role;
revoke execute on function private.grp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.grp_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('varelo-reserves', '7 * * * *', $cron$select private.grp_tache_reserves()$cron$);
