-- b2_11 — Sortie de flotte (audit des promesses, § 2 Tavaro, point 3 ; module 05 ; session B2, 06/10/2026).
-- La promesse (components/secteurs/location/textes.ts) : « Tavaro tient une fiche économique par véhicule, avec son
-- revenu, son entretien, ses jours d'immobilisation et sa valeur de revente. Il désigne ceux qui coûtent plus qu'ils ne
-- rapportent, puis propose le moment et le canal de revente. » ; « Chaque véhicule est comparé à son prix de revente
-- réel plutôt qu'à sa valeur comptable. » ; « La décision de vendre, de garder ou de renouveler se prend véhicule par
-- véhicule, chiffres à l'appui. » ; « La direction valide chaque mise en vente, et le journal en garde la trace. »
--
-- CE QUE ÇA POSE (rien n'est effacé ni remplacé dans le socle) :
--   · loc_reglages : sortie_km_max (100 000), sortie_age_mois_max (36), decote_annuelle_pct (15) ;
--   · public.loc_vehicules_economie : ce que l'export ne porte pas — achat ou financement (prix, loyer, fin de contrat),
--     et la cote de revente réelle (source, date) ; lue par la direction et les valideurs seulement ;
--   · private.loc_fiche_vehicule : la fiche sur douze mois — revenu (jours loués × tarif du contrat, frais facturés),
--     coûts (atelier, carrosserie, loyers, perte de valeur au prix de revente réel), jours d'immobilisation, taux
--     d'utilisation, kilométrage et rythme — puis l'avis (sortir, surveiller, garder, restituer), le moment et le canal ;
--   · public.loc_fiches_flotte() : toutes les fiches, pour la direction et les valideurs ;
--   · public.loc_sorties_flotte : la mise en vente proposée (fiche figée au moment de la proposition), validée ou
--     refusée par la direction — une autre personne que celle qui propose —, puis la vente conclue ; le véhicule passe
--     « sorti » ; tout au journal.
-- Le revenu est estimé à partir des contrats (le tarif journalier qu'ils portent) : la fiche le dit, et compte les
-- contrats sans tarif. La perte de valeur se lit sur la cote réelle saisie (pas la valeur comptable).

alter table public.loc_reglages add column if not exists sortie_km_max integer not null default 100000;
alter table public.loc_reglages add column if not exists sortie_age_mois_max smallint not null default 36;
alter table public.loc_reglages add column if not exists decote_annuelle_pct numeric(4,1) not null default 15;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_sortie_check') then
    alter table public.loc_reglages add constraint loc_reglages_sortie_check
      check (sortie_km_max between 10000 and 1000000 and sortie_age_mois_max between 6 and 240 and decote_annuelle_pct between 0 and 60);
  end if;
end $$;

-- ── L'économie d'un véhicule ─────────────────────────────────────────────────────────────
create table if not exists public.loc_vehicules_economie (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  financement text not null default 'achat',
  prix_achat_eur numeric(12,2),
  entree_le date,
  loyer_mensuel_eur numeric(10,2),
  fin_contrat_le date,
  cote_eur numeric(12,2),
  cote_source text,
  cote_le date,
  valeur_comptable_eur numeric(12,2),
  maj_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_vehicules_economie_pkey primary key (id),
  constraint loc_vehicules_economie_un unique (client_id, vehicule_id),
  constraint loc_vehicules_economie_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_vehicules_economie_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_vehicules_economie_financement_check check (financement in ('achat', 'credit', 'lld', 'loa')),
  constraint loc_vehicules_economie_montants check (prix_achat_eur >= 0 and loyer_mensuel_eur >= 0 and cote_eur >= 0 and valeur_comptable_eur >= 0),
  constraint loc_vehicules_economie_source_check check (cote_source in ('argus', 'la_centrale', 'offre_reprise', 'offre_marchand', 'estimation')),
  constraint loc_vehicules_economie_cote check ((cote_eur is null) = (cote_le is null) and (cote_eur is null) = (cote_source is null))
);
comment on table public.loc_vehicules_economie is 'b2_11 : achat ou financement d''un véhicule et sa cote de revente réelle (source, date)';

alter table public.loc_vehicules_economie enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_vehicules_economie' and policyname = 'la direction lit l''economie de la flotte') then
    create policy "la direction lit l'economie de la flotte" on public.loc_vehicules_economie for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin', 'valideur']));
  end if;
end $$;
revoke all on table public.loc_vehicules_economie from public, anon, authenticated;
grant select on table public.loc_vehicules_economie to authenticated;
grant all on table public.loc_vehicules_economie to service_role;

-- ── Les sorties de flotte ───────────────────────────────────────────────────────────────
create table if not exists public.loc_sorties_flotte (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  statut text not null default 'proposee',
  canal text not null,
  prix_vise_eur numeric(12,2),
  mise_en_vente_le date,
  motif text not null,
  fiche jsonb not null,
  propose_par uuid not null,
  propose_le timestamp with time zone not null default now(),
  decide_par uuid,
  decide_le timestamp with time zone,
  refus_motif text,
  prix_vente_eur numeric(12,2),
  vendu_le date,
  acheteur text,
  maj_le timestamp with time zone not null default now(),
  constraint loc_sorties_flotte_pkey primary key (id),
  constraint loc_sorties_flotte_client_id_id_key unique (client_id, id),
  constraint loc_sorties_flotte_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_sorties_flotte_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_sorties_flotte_statut_check check (statut in ('proposee', 'validee', 'refusee', 'vendue', 'annulee')),
  constraint loc_sorties_flotte_canal_check check (canal in ('reprise_concession', 'marchand', 'encheres', 'particulier', 'restitution_loueur')),
  constraint loc_sorties_flotte_decision check (statut = 'proposee' or statut = 'annulee' or (decide_par is not null and decide_le is not null)),
  constraint loc_sorties_flotte_autre_personne check (decide_par is null or decide_par <> propose_par),
  constraint loc_sorties_flotte_refus check ((statut = 'refusee') = (refus_motif is not null)),
  constraint loc_sorties_flotte_vente check ((statut = 'vendue') = (vendu_le is not null and prix_vente_eur is not null)),
  constraint loc_sorties_flotte_textes check (char_length(motif) between 5 and 1000 and char_length(refus_motif) <= 1000 and char_length(acheteur) <= 200),
  constraint loc_sorties_flotte_montants check (prix_vise_eur >= 0 and prix_vente_eur >= 0)
);
comment on table public.loc_sorties_flotte is 'b2_11 : mises en vente proposées, validées par la direction (une autre personne), puis conclues';
create unique index if not exists loc_sorties_flotte_une_ouverte on public.loc_sorties_flotte (client_id, vehicule_id) where statut in ('proposee', 'validee');

alter table public.loc_sorties_flotte enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_sorties_flotte' and policyname = 'la direction lit les sorties de flotte') then
    create policy "la direction lit les sorties de flotte" on public.loc_sorties_flotte for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin', 'valideur']));
  end if;
end $$;
revoke all on table public.loc_sorties_flotte from public, anon, authenticated;
grant select on table public.loc_sorties_flotte to authenticated;
grant all on table public.loc_sorties_flotte to service_role;

do $$
declare t text;
begin
  foreach t in array array['loc_vehicules_economie', 'loc_sorties_flotte'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_tracer' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I after insert or update on public.%I for each row execute function private.tracer(%L)', t || '_tracer', t, 'maj_le');
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── La fiche économique ─────────────────────────────────────────────────────────────────

-- Un nombre écrit à la française, par milliers (105 000).
CREATE OR REPLACE FUNCTION private.loc_milliers(p numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select replace(to_char(round(p), 'FM999G999G999G990'), ',', ' ')
$function$;

-- Sur les douze mois qui finissent à p_au. Rend la fiche et l'avis : sortir, surveiller, garder, restituer.
CREATE OR REPLACE FUNCTION private.loc_fiche_vehicule(p_client uuid, p_vehicule uuid, p_au timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v public.loc_vehicules;
  x public.loc_vehicules_economie;
  g public.loc_reglages;
  v_debut timestamptz := p_au - interval '365 days';
  v_utilitaire boolean;
  v_jours_flotte numeric;
  v_jours_loues numeric := 0;
  v_revenu_location numeric := 0;
  v_sans_tarif integer := 0;
  v_frais numeric := 0;
  v_atelier numeric := 0;
  v_jours_immo numeric := 0;
  v_financement numeric := 0;
  v_perte numeric;
  v_couts numeric;
  v_marge numeric;
  v_utilisation numeric;
  v_age_mois integer;
  v_km_an numeric;
  v_km integer;
  v_km_max integer;
  v_age_max integer;
  v_avis text;
  v_raisons text[] := '{}';
  v_moment text;
  v_moment_le date;
  v_canal text;
  v_canal_raison text;
  v_ct date;
begin
  select * into v from public.loc_vehicules where client_id = p_client and id = p_vehicule;
  if not found then
    return null;
  end if;
  select * into x from public.loc_vehicules_economie where client_id = p_client and vehicule_id = p_vehicule;
  select * into g from public.loc_reglages where client_id = p_client;
  v_km_max := coalesce(g.sortie_km_max, 100000);
  v_age_max := coalesce(g.sortie_age_mois_max, 36);
  select c.utilitaire into v_utilitaire from public.loc_categories c where c.client_id = p_client and c.id = v.categorie_id;

  -- les jours en flotte sur la période (depuis l'entrée si elle est plus récente)
  v_jours_flotte := greatest(1, extract(epoch from (p_au - greatest(v_debut, coalesce(x.entree_le::timestamptz, v.mise_en_circulation::timestamptz, v.cree_le, v_debut)))) / 86400);

  -- le revenu : chaque contrat, au prorata de la période, au tarif journalier qu'il porte (jour entamé dû)
  select coalesce(sum(j.jours), 0), coalesce(sum(j.jours * c.tarif_jour_eur), 0), count(*) filter (where c.tarif_jour_eur is null)
    into v_jours_loues, v_revenu_location, v_sans_tarif
  from public.loc_contrats c
  cross join lateral (select greatest(0, ceil(extract(epoch from (least(coalesce(c.retour_reel_le, c.retour_prevu_le), p_au) - greatest(c.depart_le, v_debut))) / 86400)) as jours) j
  where c.client_id = p_client and c.vehicule_id = p_vehicule and c.statut <> 'annule' and c.disparu_le is null
    and c.depart_le < p_au and coalesce(c.retour_reel_le, c.retour_prevu_le) > v_debut;
  -- les frais refacturés (hors dommages, qui remboursent une réparation)
  select coalesce(sum(f.total_ht), 0) into v_frais
  from public.loc_factures f join public.loc_contrats c on c.client_id = f.client_id and c.id = f.contrat_id
  where f.client_id = p_client and c.vehicule_id = p_vehicule and f.nature = 'frais' and f.statut <> 'avoir' and f.date_facture >= v_debut::date;

  -- l'atelier et la carrosserie : les coûts notés sur les immobilisations, et les entretiens sans immobilisation
  if to_regclass('public.loc_immobilisations') is not null then
    select coalesce(sum(i.cout_eur) filter (where coalesce(i.fin_le, i.debut_le) >= v_debut), 0),
           coalesce(sum(greatest(0, extract(epoch from (least(coalesce(i.fin_le, p_au), p_au) - greatest(i.debut_le, v_debut))) / 86400)) filter (where i.motif <> 'preparation'), 0)
      into v_atelier, v_jours_immo
    from public.loc_immobilisations i
    where i.client_id = p_client and i.vehicule_id = p_vehicule and i.debut_le < p_au and coalesce(i.fin_le, p_au) > v_debut;
    select v_atelier + coalesce(sum(e.cout_eur), 0) into v_atelier from public.loc_entretiens e
    where e.client_id = p_client and e.vehicule_id = p_vehicule and e.statut = 'fait' and e.immobilisation_id is null and e.fait_le >= v_debut;
  end if;

  -- le financement : les loyers de la période (crédit, LLD, LOA)
  if x.financement in ('credit', 'lld', 'loa') and x.loyer_mensuel_eur is not null then
    v_financement := round(x.loyer_mensuel_eur * v_jours_flotte / 30.4375, 2);
  end if;
  -- la perte de valeur : sur la cote de revente réelle, à la décote annuelle réglée (un véhicule en LLD ne perd rien pour le loueur)
  v_perte := case when x.financement in ('lld', 'loa') then 0
                  when x.cote_eur is not null then round(x.cote_eur * coalesce(g.decote_annuelle_pct, 15) / 100 * v_jours_flotte / 365, 2) end;

  v_couts := v_atelier + v_financement + coalesce(v_perte, 0);
  v_marge := round(v_revenu_location + v_frais - v_couts, 2);
  v_utilisation := round(least(1, v_jours_loues / v_jours_flotte) * 100, 1);
  v_age_mois := case when coalesce(x.entree_le, v.mise_en_circulation) is not null
                     then (extract(year from age(p_au::date, coalesce(v.mise_en_circulation, x.entree_le))) * 12 + extract(month from age(p_au::date, coalesce(v.mise_en_circulation, x.entree_le))))::int end;
  v_km := v.km_dernier;
  select (max(coalesce(c.km_retour, c.km_depart)) - min(c.km_depart)) * 365.0 / greatest(30, extract(epoch from (p_au - min(c.depart_le))) / 86400)
    into v_km_an
  from public.loc_contrats c
  where c.client_id = p_client and c.vehicule_id = p_vehicule and c.depart_le >= v_debut and c.km_depart is not null;

  -- l'avis
  if x.financement in ('lld', 'loa') and x.fin_contrat_le is not null and x.fin_contrat_le <= (p_au + interval '90 days')::date then
    v_avis := 'restituer';
    v_raisons := array_append(v_raisons, format('le contrat de %s finit le %s', upper(x.financement), to_char(x.fin_contrat_le, 'DD/MM/YYYY')));
  end if;
  if v_marge < 0 then
    v_raisons := array_append(v_raisons, format('il a coûté %s € de plus qu''il n''a rapporté sur douze mois', private.loc_milliers(-v_marge)));
  end if;
  if v_km is not null and v_km >= v_km_max then
    v_raisons := array_append(v_raisons, format('%s km, au-delà de votre seuil de %s km', private.loc_milliers(v_km), private.loc_milliers(v_km_max)));
  end if;
  if v_age_mois is not null and v_age_mois >= v_age_max then
    v_raisons := array_append(v_raisons, format('%s mois, au-delà de votre seuil de %s mois', v_age_mois, v_age_max));
  end if;
  if v_avis is null then
    v_avis := case when cardinality(v_raisons) > 0 then 'sortir'
                   when (v_km is not null and v_km >= v_km_max * 0.85) or (v_age_mois is not null and v_age_mois >= v_age_max - 4) or v_utilisation < 50
                     or (v_marge < (v_revenu_location + v_frais) * 0.1) then 'surveiller'
                   else 'garder' end;
    if v_avis = 'surveiller' then
      if v_utilisation < 50 then v_raisons := array_append(v_raisons, format('loué %s %% du temps', v_utilisation)); end if;
      if v_km is not null and v_km >= v_km_max * 0.85 then v_raisons := array_append(v_raisons, format('%s km, près du seuil de %s km', private.loc_milliers(v_km), private.loc_milliers(v_km_max))); end if;
      if v_age_mois is not null and v_age_mois >= v_age_max - 4 then v_raisons := array_append(v_raisons, format('%s mois, près du seuil', v_age_mois)); end if;
      if cardinality(v_raisons) = 0 then v_raisons := array_append(v_raisons, 'la marge est faible'); end if;
    end if;
  end if;

  -- le moment : avant le seuil de kilométrage au rythme actuel, avant le prochain contrôle technique, avant le seuil d'âge
  if v_km is not null and v_km_an is not null and v_km_an > 0 and v_km < v_km_max then
    v_moment_le := (p_au + make_interval(days => ceil((v_km_max - v_km) / v_km_an * 365)::int))::date;
    v_moment := format('avant %s km, vers le %s au rythme actuel', private.loc_milliers(v_km_max), to_char(v_moment_le, 'DD/MM/YYYY'));
  end if;
  if to_regclass('public.loc_entretiens') is not null then
    select min(e.echeance_le) into v_ct from public.loc_entretiens e
    where e.client_id = p_client and e.vehicule_id = p_vehicule and e.nature = 'controle_technique' and e.statut in ('a_planifier', 'planifie');
    if v_ct is not null and (v_moment_le is null or v_ct < v_moment_le) then
      v_moment_le := v_ct;
      v_moment := format('avant le contrôle technique du %s', to_char(v_ct, 'DD/MM/YYYY'));
    end if;
  end if;
  if v_avis in ('sortir', 'restituer') then
    v_moment := coalesce('dès maintenant — ' || v_moment, 'dès maintenant');
    v_moment_le := (p_au)::date;
  end if;

  -- le canal
  if x.financement in ('lld', 'loa') then
    v_canal := 'restitution_loueur'; v_canal_raison := 'véhicule financé : il se restitue au loueur financier, sans frais de remise en état au-delà de l''usure normale';
  elsif coalesce(v_utilitaire, false) or coalesce(v_km, 0) >= 150000 then
    v_canal := 'encheres'; v_canal_raison := 'utilitaire ou kilométrage élevé : les ventes aux enchères professionnelles donnent le meilleur prix sans délai';
  elsif coalesce(v_age_mois, 99) <= 24 and coalesce(v_km, 0) <= 40000 then
    v_canal := 'reprise_concession'; v_canal_raison := 'récent et peu roulé : une reprise en concession, contre un véhicule neuf, valorise au mieux la cote';
  else
    v_canal := 'marchand'; v_canal_raison := 'un marchand règle vite au prix de la cote, sans annonce ni essais';
  end if;

  return jsonb_build_object(
    'vehicule', v.id, 'immatriculation', v.immatriculation, 'modele', v.modele, 'utilitaire', coalesce(v_utilitaire, false),
    'periode', jsonb_build_object('du', v_debut::date, 'au', p_au::date, 'jours', round(v_jours_flotte)),
    'revenu', jsonb_build_object('location', round(v_revenu_location, 2), 'frais', round(v_frais, 2), 'total', round(v_revenu_location + v_frais, 2),
                                 'jours_loues', v_jours_loues, 'contrats_sans_tarif', v_sans_tarif),
    'couts', jsonb_build_object('atelier', round(v_atelier, 2), 'financement', v_financement, 'perte_valeur', v_perte, 'total', round(v_couts, 2)),
    'marge', v_marge, 'utilisation_pct', v_utilisation, 'jours_immobilises', round(v_jours_immo, 1),
    'km', v_km, 'km_an', round(v_km_an), 'age_mois', v_age_mois,
    'financement', coalesce(x.financement, 'achat'), 'fin_contrat_le', x.fin_contrat_le,
    'cote', case when x.cote_eur is not null then jsonb_build_object('eur', x.cote_eur, 'source', x.cote_source, 'le', x.cote_le) end,
    'valeur_comptable', x.valeur_comptable_eur,
    'ecart_cote_comptable', case when x.cote_eur is not null and x.valeur_comptable_eur is not null then x.cote_eur - x.valeur_comptable_eur end,
    'avis', v_avis, 'raisons', to_jsonb(v_raisons), 'moment', v_moment, 'moment_le', v_moment_le,
    'canal', v_canal, 'canal_raison', v_canal_raison,
    'complet', x.id is not null and (x.cote_eur is not null or x.financement in ('lld', 'loa')));
end $function$;

-- Toutes les fiches de la flotte en service, pour la direction et les valideurs.
CREATE OR REPLACE FUNCTION public.loc_fiches_flotte()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'La fiche économique de la flotte se lit par la direction ou un valideur.');
begin
  return coalesce((select jsonb_agg(private.loc_fiche_vehicule(v_client, v.id) order by v.immatriculation)
                   from public.loc_vehicules v
                   where v.client_id = v_client and v.statut <> 'sorti' and v.disparu_le is null), '[]'::jsonb);
end $function$;

-- Ce que l'export ne porte pas : financement, prix, loyer, et la cote réelle (source et date obligatoires).
-- p_valeurs : {financement?, prix_achat_eur?, entree_le?, loyer_mensuel_eur?, fin_contrat_le?, cote_eur?, cote_source?, cote_le?, valeur_comptable_eur?}
CREATE OR REPLACE FUNCTION public.loc_poser_economie(p_vehicule uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'L''économie d''un véhicule se saisit par la direction ou un valideur.');
  x public.loc_vehicules_economie;
  v_cote numeric;
  v_cote_le date;
begin
  if not exists (select 1 from public.loc_vehicules v where v.client_id = v_client and v.id = p_vehicule) then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  insert into public.loc_vehicules_economie (client_id, vehicule_id, maj_par) values (v_client, p_vehicule, (select auth.uid()))
  on conflict on constraint loc_vehicules_economie_un do nothing;
  select * into x from public.loc_vehicules_economie where client_id = v_client and vehicule_id = p_vehicule for update;
  begin
    if p_valeurs ? 'financement' then
      if coalesce(p_valeurs ->> 'financement', '') not in ('achat', 'credit', 'lld', 'loa') then
        raise exception 'Financement inconnu : achat, credit, lld ou loa.' using errcode = '22023';
      end if;
      x.financement := p_valeurs ->> 'financement';
    end if;
    if p_valeurs ? 'prix_achat_eur' then x.prix_achat_eur := round(nullif(p_valeurs ->> 'prix_achat_eur', '')::numeric, 2); end if;
    if p_valeurs ? 'entree_le' then x.entree_le := nullif(p_valeurs ->> 'entree_le', '')::date; end if;
    if p_valeurs ? 'loyer_mensuel_eur' then x.loyer_mensuel_eur := round(nullif(p_valeurs ->> 'loyer_mensuel_eur', '')::numeric, 2); end if;
    if p_valeurs ? 'fin_contrat_le' then x.fin_contrat_le := nullif(p_valeurs ->> 'fin_contrat_le', '')::date; end if;
    if p_valeurs ? 'valeur_comptable_eur' then x.valeur_comptable_eur := round(nullif(p_valeurs ->> 'valeur_comptable_eur', '')::numeric, 2); end if;
    if p_valeurs ? 'cote_eur' then
      v_cote := round(nullif(p_valeurs ->> 'cote_eur', '')::numeric, 2);
      v_cote_le := coalesce(nullif(p_valeurs ->> 'cote_le', '')::date, current_date);
      if v_cote is not null and coalesce(p_valeurs ->> 'cote_source', '') not in ('argus', 'la_centrale', 'offre_reprise', 'offre_marchand', 'estimation') then
        raise exception 'Une cote dit d''où elle vient : argus, la_centrale, offre_reprise, offre_marchand ou estimation.' using errcode = '22023';
      end if;
      if v_cote_le > current_date then
        raise exception 'La cote est datée du jour où elle a été lue.' using errcode = '22023';
      end if;
      x.cote_eur := v_cote;
      x.cote_source := case when v_cote is not null then p_valeurs ->> 'cote_source' end;
      x.cote_le := case when v_cote is not null then v_cote_le end;
    end if;
  exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    raise exception 'Valeur illisible.' using errcode = '22023';
  end;
  begin
    update public.loc_vehicules_economie
       set financement = x.financement, prix_achat_eur = x.prix_achat_eur, entree_le = x.entree_le, loyer_mensuel_eur = x.loyer_mensuel_eur,
           fin_contrat_le = x.fin_contrat_le, cote_eur = x.cote_eur, cote_source = x.cote_source, cote_le = x.cote_le,
           valeur_comptable_eur = x.valeur_comptable_eur, maj_par = (select auth.uid())
     where id = x.id;
  exception when check_violation then
    raise exception 'Valeur refusée : %.', sqlerrm using errcode = '22023';
  end;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.economie_posee', 'loc_vehicules', p_vehicule::text,
    jsonb_build_object('champs', (select jsonb_agg(k) from jsonb_object_keys(p_valeurs) k), 'par', (select auth.uid())), null);
  return private.loc_fiche_vehicule(v_client, p_vehicule);
end $function$;

-- ── La mise en vente ────────────────────────────────────────────────────────────────────

-- Proposer : la fiche est figée au moment de la proposition ; une seule sortie ouverte par véhicule.
-- p_valeurs : {canal?, prix_vise_eur?, mise_en_vente_le?, motif}
CREATE OR REPLACE FUNCTION public.loc_proposer_sortie(p_vehicule uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Une sortie de flotte se propose par la direction ou un valideur.');
  v_fiche jsonb;
  v_id uuid;
  v_canal text;
  v_motif text := private.loc_lire_texte(p_valeurs, 'motif', 1000);
  v_prix numeric;
  v_le date;
begin
  v_fiche := private.loc_fiche_vehicule(v_client, p_vehicule);
  if v_fiche is null then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.loc_vehicules v where v.client_id = v_client and v.id = p_vehicule and v.statut = 'sorti') then
    raise exception 'Ce véhicule est déjà sorti de la flotte.' using errcode = '23514';
  end if;
  if v_motif is null or char_length(v_motif) < 5 then
    raise exception 'La proposition dit pourquoi, chiffres à l''appui (cinq caractères au moins).' using errcode = '22023';
  end if;
  v_canal := coalesce(nullif(p_valeurs ->> 'canal', ''), v_fiche ->> 'canal');
  if v_canal not in ('reprise_concession', 'marchand', 'encheres', 'particulier', 'restitution_loueur') then
    raise exception 'Canal inconnu.' using errcode = '22023';
  end if;
  begin
    v_prix := round(nullif(p_valeurs ->> 'prix_vise_eur', '')::numeric, 2);
    v_le := nullif(p_valeurs ->> 'mise_en_vente_le', '')::date;
  exception when others then
    raise exception 'Prix ou date illisible.' using errcode = '22023';
  end;
  begin
    insert into public.loc_sorties_flotte (client_id, vehicule_id, canal, prix_vise_eur, mise_en_vente_le, motif, fiche, propose_par)
    values (v_client, p_vehicule, v_canal, coalesce(v_prix, (v_fiche -> 'cote' ->> 'eur')::numeric), v_le, v_motif, v_fiche, (select auth.uid()))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Une sortie de ce véhicule est déjà proposée ou validée.' using errcode = '23505';
  end;
  perform private.lever_alerte_module(v_client, 'tavaro', 'info',
    format('Sortie de flotte proposée pour %s (%s) : la direction la valide.', v_fiche ->> 'immatriculation', replace(v_canal, '_', ' ')),
    jsonb_build_object('sortie', v_id), 'sortie:proposee:' || v_id::text, true, null);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.sortie_proposee', 'loc_sorties_flotte', v_id::text,
    jsonb_build_object('vehicule', v_fiche ->> 'immatriculation', 'canal', v_canal, 'prix_vise', v_prix, 'avis', v_fiche ->> 'avis', 'marge', v_fiche -> 'marge',
                       'par', (select auth.uid())), null);
  return jsonb_build_object('sortie', v_id, 'statut', 'proposee', 'canal', v_canal);
end $function$;

-- La direction décide : une autre personne que celle qui propose.
CREATE OR REPLACE FUNCTION public.loc_decider_sortie(p_sortie uuid, p_valider boolean, p_motif text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin'], 'La direction seule valide une mise en vente.');
  v_uid uuid := (select auth.uid());
  s public.loc_sorties_flotte;
begin
  select * into s from public.loc_sorties_flotte where client_id = v_client and id = p_sortie for update;
  if not found then
    raise exception 'Sortie introuvable.' using errcode = 'P0002';
  end if;
  if s.statut <> 'proposee' then
    raise exception 'Cette sortie est déjà décidée (%).', s.statut using errcode = '23514';
  end if;
  if s.propose_par = v_uid then
    raise exception 'Une autre personne de la direction valide ce que vous avez proposé.' using errcode = '42501';
  end if;
  if p_valider is null then
    raise exception 'Valider ou refuser.' using errcode = '22023';
  end if;
  if not p_valider and char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Un refus dit pourquoi (cinq caractères au moins).' using errcode = '22023';
  end if;
  update public.loc_sorties_flotte
     set statut = case when p_valider then 'validee' else 'refusee' end, decide_par = v_uid, decide_le = now(),
         refus_motif = case when p_valider then null else left(btrim(p_motif), 1000) end
   where id = s.id;
  perform private.journaliser_module(v_client, 'tavaro', case when p_valider then 'tavaro.sortie_validee' else 'tavaro.sortie_refusee' end,
    'loc_sorties_flotte', s.id::text, jsonb_build_object('vehicule', s.fiche ->> 'immatriculation', 'par', v_uid, 'propose_par', s.propose_par,
                                                         'motif', case when p_valider then null else left(btrim(p_motif), 1000) end), null);
  return jsonb_build_object('sortie', s.id, 'statut', case when p_valider then 'validee' else 'refusee' end);
end $function$;

-- La vente conclue (ou la restitution faite) : le véhicule sort de la flotte.
CREATE OR REPLACE FUNCTION public.loc_conclure_sortie(p_sortie uuid, p_prix_vente_eur numeric, p_vendu_le date DEFAULT NULL::date, p_acheteur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Une vente se conclut par la direction ou un valideur.');
  s public.loc_sorties_flotte;
  v_le date := coalesce(p_vendu_le, current_date);
begin
  select * into s from public.loc_sorties_flotte where client_id = v_client and id = p_sortie for update;
  if not found then
    raise exception 'Sortie introuvable.' using errcode = 'P0002';
  end if;
  if s.statut <> 'validee' then
    raise exception 'Une vente se conclut après la validation de la direction (statut : %).', s.statut using errcode = '23514';
  end if;
  if p_prix_vente_eur is null or p_prix_vente_eur < 0 then
    raise exception 'Le prix de vente est obligatoire (0 pour une restitution).' using errcode = '22023';
  end if;
  if v_le > current_date then
    raise exception 'La vente est conclue : sa date n''est pas à venir.' using errcode = '22023';
  end if;
  update public.loc_sorties_flotte set statut = 'vendue', prix_vente_eur = round(p_prix_vente_eur, 2), vendu_le = v_le, acheteur = left(nullif(btrim(p_acheteur), ''), 200)
   where id = s.id;
  update public.loc_vehicules set statut = 'sorti' where client_id = v_client and id = s.vehicule_id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.sortie_conclue', 'loc_sorties_flotte', s.id::text,
    jsonb_build_object('vehicule', s.fiche ->> 'immatriculation', 'prix_vente', p_prix_vente_eur, 'prix_vise', s.prix_vise_eur,
                       'cote', s.fiche -> 'cote' -> 'eur', 'canal', s.canal, 'par', (select auth.uid())), null);
  return jsonb_build_object('sortie', s.id, 'statut', 'vendue');
end $function$;

-- Retirer une proposition (le véhicule reste) : celle ou celui qui l'a faite, ou la direction.
CREATE OR REPLACE FUNCTION public.loc_annuler_sortie(p_sortie uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Une sortie de flotte se retire par la direction ou un valideur.');
  s public.loc_sorties_flotte;
begin
  select * into s from public.loc_sorties_flotte where client_id = v_client and id = p_sortie for update;
  if not found then
    raise exception 'Sortie introuvable.' using errcode = 'P0002';
  end if;
  if s.statut not in ('proposee', 'validee') then
    raise exception 'Cette sortie est close (%).', s.statut using errcode = '23514';
  end if;
  if s.propose_par <> (select auth.uid()) and not private.a_un_role(v_client, array['gerant', 'admin']) then
    raise exception 'La personne qui a proposé, ou la direction, retire la proposition.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Le retrait dit pourquoi (cinq caractères au moins).' using errcode = '22023';
  end if;
  update public.loc_sorties_flotte set statut = 'annulee', refus_motif = null where id = s.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.sortie_retiree', 'loc_sorties_flotte', s.id::text,
    jsonb_build_object('motif', left(btrim(p_motif), 1000), 'par', (select auth.uid())), null);
  return jsonb_build_object('sortie', s.id, 'statut', 'annulee');
end $function$;

revoke all on function private.loc_milliers(numeric) from public, anon, authenticated;
revoke all on function private.loc_fiche_vehicule(uuid, uuid, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_fiche_vehicule(uuid, uuid, timestamp with time zone) to service_role;
revoke all on function public.loc_fiches_flotte() from public, anon;
revoke all on function public.loc_poser_economie(uuid, jsonb) from public, anon;
revoke all on function public.loc_proposer_sortie(uuid, jsonb) from public, anon;
revoke all on function public.loc_decider_sortie(uuid, boolean, text) from public, anon;
revoke all on function public.loc_conclure_sortie(uuid, numeric, date, text) from public, anon;
revoke all on function public.loc_annuler_sortie(uuid, text) from public, anon;
grant execute on function public.loc_fiches_flotte() to authenticated, service_role;
grant execute on function public.loc_poser_economie(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_proposer_sortie(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_decider_sortie(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.loc_conclure_sortie(uuid, numeric, date, text) to authenticated, service_role;
grant execute on function public.loc_annuler_sortie(uuid, text) to authenticated, service_role;
