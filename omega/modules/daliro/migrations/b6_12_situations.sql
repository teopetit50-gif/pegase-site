-- b6_12 — DALIRO : les situations de travaux mensuelles (session B6, 06/10/2026) — Vague 3, n° 1
--
-- CE QUE ÇA CORRIGE. Daliro vérifie le marché, chiffre et fait signer les avenants, confirme les passages… et
-- ne facture pas. Une entreprise du BTP se paie par SITUATIONS : chaque mois, l'avancement cumulé de chaque
-- ligne du marché (et des avenants signés) ; l'acompte de la période = cumul − cumul de la situation
-- précédente ; moins la retenue de garantie ; TVA selon le chantier.
--
-- RÈGLES TENUES PAR LA BASE.
--   · Base : les lignes du marché VÉRIFIÉ (hors options) et des avenants SIGNÉS (lignes non retirées, signe compris).
--   · Avancement cumulé en % par ligne, de 0 à 100, qui ne recule pas sous la situation précédente validée.
--   · Retenue de garantie : taux, base (HT / TTC) et caution repris du marché ; au plus 5 % (loi n° 71-584 du
--     16 juillet 1971, d'ordre public ; contrainte déjà posée sur btp_marches) ; remplacée par une caution → 0.
--   · TVA : régime du chantier (private.btp_regime_tva) — « autoliquidation » quand l'entreprise est sous-traitante
--     (CGI art. 283-2 nonies : pas de TVA facturée, mention obligatoire), « non_applicable » (Guyane, Mayotte)
--     et « hors_champ » → 0 ; sinon le taux de la zone (métropole et Corse 20 %, Guadeloupe / Martinique /
--     La Réunion 8,5 %), ou un taux réduit choisi à l'ouverture (10 %, 5,5 %, 2,1 %).
--   · Une seule situation en cours (brouillon / soumise / refusée) par chantier ; numéros continus ; la date de
--     fin de période avance d'une situation à l'autre.
--   · Validation à deux personnes : soumettre dépose une demande « daliro.valider_situation » du socle (montant =
--     net à payer) ; celui qui l'a saisie n'en décide pas (socle) ; valider exige la demande approuvée, fige les
--     montants et les mentions. Une demande rejetée passe la situation « refusée » (elle se corrige et se resoumet).
--   · Écriture par les portes seulement (SECURITY DEFINER) ; lecture sous RLS : l'entité ET le droit de voir les
--     prix (une situation, c'est de l'argent). Journal : private.journaliser.
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.

create table if not exists public.btp_situations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  marche_id uuid not null,
  numero integer not null,
  periode_fin date not null,
  statut text not null default 'brouillon',
  regime_tva text not null,
  taux_tva numeric(5,4) not null,
  autoliquidation boolean not null default false,
  retenue_taux numeric(5,4) not null default 0,
  retenue_base text not null default 'ttc',
  retenue_caution boolean not null default false,
  cumul_ht numeric(14,2) not null default 0,
  precedent_ht numeric(14,2) not null default 0,
  periode_ht numeric(14,2) not null default 0,
  tva numeric(14,2) not null default 0,
  retenue numeric(14,2) not null default 0,
  net_a_payer numeric(14,2) not null default 0,
  mentions jsonb not null default '[]'::jsonb,
  demande_id uuid,
  soumise_le timestamptz,
  validee_le timestamptz,
  validee_par uuid,
  validee_libelle text,
  motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_situations_client_id_id_key unique (client_id, id),
  constraint btp_situations_numero_key unique (chantier_id, numero),
  constraint btp_situations_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_situations_marche_fkey foreign key (client_id, marche_id) references public.btp_marches(client_id, id) on delete restrict,
  constraint btp_situations_statut_check check (statut in ('brouillon', 'soumise', 'refusee', 'validee', 'annulee')),
  constraint btp_situations_regime_check check (regime_tva in ('normal', 'autoliquidation', 'non_applicable', 'hors_champ')),
  constraint btp_situations_taux_tva_check check (taux_tva in (0, 0.021, 0.055, 0.085, 0.1, 0.2)),
  constraint btp_situations_retenue_taux_check check (retenue_taux >= 0 and retenue_taux <= 0.05),
  constraint btp_situations_retenue_base_check check (retenue_base in ('ht', 'ttc')),
  constraint btp_situations_numero_check check (numero >= 1),
  constraint btp_situations_motif_check check (char_length(motif) <= 500)
);
comment on table public.btp_situations is 'DALIRO — situations de travaux (acomptes mensuels à l''avancement), écrites par les portes btp_*_situation seulement.';

create table if not exists public.btp_situations_lignes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  situation_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  origine text not null,
  ligne_marche_id uuid,
  ligne_avenant_id uuid,
  avenant_numero integer,
  lot_id uuid,
  ordre integer not null default 0,
  designation text not null,
  base_ht numeric(14,2) not null,
  avancement numeric(5,2) not null default 0,
  precedent_avancement numeric(5,2) not null default 0,
  cumule_ht numeric(14,2) generated always as (round(base_ht * avancement / 100, 2)) stored,
  precedent_ht numeric(14,2) generated always as (round(base_ht * precedent_avancement / 100, 2)) stored,
  maj_le timestamptz not null default now(),
  constraint btp_situations_lignes_client_id_id_key unique (client_id, id),
  constraint btp_situations_lignes_situation_fkey foreign key (client_id, situation_id) references public.btp_situations(client_id, id) on delete cascade,
  constraint btp_situations_lignes_origine_check check (origine in ('marche', 'avenant')),
  constraint btp_situations_lignes_source_check check ((origine = 'marche' and ligne_marche_id is not null) or (origine = 'avenant' and ligne_avenant_id is not null)),
  constraint btp_situations_lignes_avancement_check check (avancement >= 0 and avancement <= 100),
  constraint btp_situations_lignes_precedent_check check (precedent_avancement >= 0 and precedent_avancement <= avancement)
);
create index if not exists btp_situations_chantier_idx on public.btp_situations (chantier_id, numero);
create index if not exists btp_situations_lignes_situation_idx on public.btp_situations_lignes (situation_id, ordre);

alter table public.btp_situations enable row level security;
alter table public.btp_situations_lignes enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_situations' and policyname = 'qui voit les prix lit les situations de ses chantiers') then
    create policy "qui voit les prix lit les situations de ses chantiers" on public.btp_situations
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id) and private.btp_voit_prix(client_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_situations_lignes' and policyname = 'qui voit les prix lit les lignes de situation') then
    create policy "qui voit les prix lit les lignes de situation" on public.btp_situations_lignes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id) and private.btp_voit_prix(client_id));
  end if;
end $do$;
revoke all on table public.btp_situations from anon, authenticated;
revoke all on table public.btp_situations_lignes from anon, authenticated;
grant select on table public.btp_situations to authenticated;
grant select on table public.btp_situations_lignes to authenticated;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_situations', 'btp_situations_lignes']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le calcul : totaux et mentions d'une situation (appelé par les portes)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_recalculer_situation(p_situation uuid)
 returns public.btp_situations
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  v_cumul numeric(14,2);
  v_prec numeric(14,2);
  v_periode numeric(14,2);
  v_tva numeric(14,2);
  v_retenue numeric(14,2);
  v_mentions jsonb := '[]'::jsonb;
begin
  select * into s from public.btp_situations where id = p_situation;
  select coalesce(sum(l.cumule_ht), 0), coalesce(sum(l.precedent_ht), 0) into v_cumul, v_prec
  from public.btp_situations_lignes l where l.situation_id = s.id;
  v_periode := v_cumul - v_prec;
  v_tva := case when s.autoliquidation or s.taux_tva = 0 then 0 else round(v_periode * s.taux_tva, 2) end;
  v_retenue := case when s.retenue_caution or s.retenue_taux = 0 then 0
                    else round(s.retenue_taux * case s.retenue_base when 'ht' then v_periode else v_periode + v_tva end, 2) end;
  if s.autoliquidation then
    v_mentions := v_mentions || to_jsonb('Autoliquidation de la TVA — article 283-2 nonies du CGI : TVA due par le preneur.'::text);
  elsif s.regime_tva = 'non_applicable' then
    v_mentions := v_mentions || to_jsonb('TVA non applicable (article 294 du CGI).'::text);
  elsif s.regime_tva = 'hors_champ' then
    v_mentions := v_mentions || to_jsonb('Opération hors du champ de la TVA française.'::text);
  end if;
  if s.retenue_caution then
    v_mentions := v_mentions || to_jsonb('Retenue de garantie remplacée par une caution (loi n° 71-584 du 16 juillet 1971, art. 1er).'::text);
  elsif s.retenue_taux > 0 then
    v_mentions := v_mentions || to_jsonb(format('Retenue de garantie de %s %% sur le montant %s de la période (loi n° 71-584 du 16 juillet 1971), libérée un an après la réception sauf opposition motivée.',
                                                 replace(regexp_replace(to_char(s.retenue_taux * 100, 'FM990.99'), '\.$', ''), '.', ','),
                                                 case s.retenue_base when 'ht' then 'HT' else 'TTC' end));
  end if;
  update public.btp_situations
  set cumul_ht = v_cumul, precedent_ht = v_prec, periode_ht = v_periode, tva = v_tva, retenue = v_retenue,
      net_a_payer = v_periode + v_tva - v_retenue, mentions = v_mentions, maj_le = now()
  where id = s.id
  returning * into s;
  return s;
end $function$;

-- Le taux de TVA par défaut de la zone du chantier.
create or replace function private.btp_taux_tva_zone(p_zone text)
 returns numeric
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p_zone in ('metropole', 'corse') then 0.2
              when p_zone in ('guadeloupe', 'martinique', 'la-reunion') then 0.085
              else 0 end::numeric
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Ouvrir la situation du mois
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_ouvrir_situation(p_chantier uuid, p_periode_fin date default current_date, p_taux_tva numeric default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  m public.btp_marches;
  v_prec public.btp_situations;
  v_en_cours public.btp_situations;
  v_regime text;
  v_taux numeric;
  v_id uuid;
  v_numero integer;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  perform pg_advisory_xact_lock(hashtextextended('daliro.situation:' || c.id::text, 0));
  if c.statut not in ('ouvert', 'suspendu', 'receptionne') then
    raise exception 'Une situation se fait sur un chantier ouvert, suspendu ou réceptionné (celui-ci est %).', c.statut using errcode = '23514';
  end if;
  select * into m from public.btp_marches where chantier_id = c.id and statut = 'verifie' order by verifie_le desc nulls last, id limit 1;
  if not found then
    raise exception 'Une situation se calcule sur un marché vérifié ligne à ligne : vérifiez d''abord le marché.' using errcode = '23514';
  end if;
  select * into v_en_cours from public.btp_situations
  where chantier_id = c.id and statut in ('brouillon', 'soumise', 'refusee') order by numero desc limit 1;
  if found then
    raise exception 'La situation n° % est déjà en cours sur ce chantier : terminez-la avant d''en ouvrir une autre.', v_en_cours.numero using errcode = '23514';
  end if;
  select * into v_prec from public.btp_situations where chantier_id = c.id and statut = 'validee' order by numero desc limit 1;
  if p_periode_fin is null or p_periode_fin > current_date + 31 then
    raise exception 'La fin de période est une date de ce mois-ci au plus tard.' using errcode = '22023';
  end if;
  if v_prec.id is not null and p_periode_fin <= v_prec.periode_fin then
    raise exception 'La période doit finir après celle de la situation n° % (%).', v_prec.numero, to_char(v_prec.periode_fin, 'DD/MM/YYYY') using errcode = '23514';
  end if;

  v_regime := coalesce(c.regime_tva, private.btp_regime_tva(c.zone_tva, c.place_client), 'normal');
  if v_regime in ('autoliquidation', 'non_applicable', 'hors_champ') then
    v_taux := case when v_regime = 'autoliquidation' then coalesce(p_taux_tva, private.btp_taux_tva_zone(c.zone_tva)) else 0 end;
  else
    v_taux := coalesce(p_taux_tva, private.btp_taux_tva_zone(c.zone_tva));
  end if;
  if v_taux not in (0, 0.021, 0.055, 0.085, 0.1, 0.2) then
    raise exception 'Taux de TVA inconnu : 20 %%, 10 %%, 5,5 %%, 8,5 %%, 2,1 %% ou 0.' using errcode = '22023';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero from public.btp_situations where chantier_id = c.id;
  insert into public.btp_situations (client_id, chantier_id, entite_id, marche_id, numero, periode_fin, regime_tva, taux_tva,
                                     autoliquidation, retenue_taux, retenue_base, retenue_caution)
  values (c.client_id, c.id, c.entite_id, m.id, v_numero, p_periode_fin, v_regime, v_taux,
          v_regime = 'autoliquidation', m.retenue_taux, m.retenue_base, m.retenue_caution)
  returning id into v_id;

  -- Les lignes : le marché vérifié (hors options), puis les avenants signés ; l'avancement repart du précédent.
  insert into public.btp_situations_lignes (client_id, situation_id, chantier_id, entite_id, origine, ligne_marche_id,
                                            lot_id, ordre, designation, base_ht, avancement, precedent_avancement)
  select c.client_id, v_id, c.id, c.entite_id, 'marche', l.id, l.lot_id, l.ordre, l.designation, l.montant_ht,
         coalesce(p.avancement, 0), coalesce(p.avancement, 0)
  from public.btp_lignes_marche l
  left join public.btp_situations_lignes p on p.situation_id = v_prec.id and p.ligne_marche_id = l.id
  where l.marche_id = m.id and l.nature <> 'option' and l.montant_ht is not null;
  insert into public.btp_situations_lignes (client_id, situation_id, chantier_id, entite_id, origine, ligne_avenant_id, avenant_numero,
                                            lot_id, ordre, designation, base_ht, avancement, precedent_avancement)
  select c.client_id, v_id, c.id, c.entite_id, 'avenant', l.id, a.numero, l.lot_id, 100000 + a.numero * 1000 + l.ordre,
         l.designation, l.montant_ht, coalesce(p.avancement, 0), coalesce(p.avancement, 0)
  from public.btp_avenants_lignes l
  join public.btp_avenants a on a.id = l.avenant_id
  left join public.btp_situations_lignes p on p.situation_id = v_prec.id and p.ligne_avenant_id = l.id
  where a.chantier_id = c.id and a.statut = 'signe' and not l.retiree;

  perform private.btp_recalculer_situation(v_id);
  perform private.journaliser(c.client_id, 'daliro.situation_ouverte', 'btp_situations', v_id::text,
    jsonb_build_object('chantier', c.id, 'numero', v_numero, 'periode_fin', p_periode_fin, 'regime_tva', v_regime, 'taux_tva', v_taux,
                       'marche', m.id, 'precedente', v_prec.id), c.entite_id);
  return v_id;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Avancer une ligne (cumul en %, jamais en recul)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_avancer_situation(p_ligne uuid, p_avancement numeric)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  l public.btp_situations_lignes;
  s public.btp_situations;
begin
  select * into l from public.btp_situations_lignes where id = p_ligne;
  if not found then
    raise exception 'Ligne de situation introuvable.' using errcode = 'P0002';
  end if;
  select * into s from public.btp_situations where id = l.situation_id for update;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut not in ('brouillon', 'refusee') then
    raise exception 'La situation n° % est %, ses avancements sont figés.', s.numero,
      case s.statut when 'soumise' then 'soumise à la validation' when 'validee' then 'validée' else 'annulée' end using errcode = '23514';
  end if;
  if p_avancement is null or p_avancement < 0 or p_avancement > 100 then
    raise exception 'Un avancement cumulé va de 0 à 100 %%.' using errcode = '22023';
  end if;
  if p_avancement < l.precedent_avancement then
    raise exception 'L''avancement cumulé ne recule pas : % %% à la situation précédente.', replace(regexp_replace(to_char(l.precedent_avancement, 'FM990.99'), '\.$', ''), '.', ',')
      using errcode = '23514';
  end if;
  update public.btp_situations_lignes set avancement = round(p_avancement, 2), maj_le = now() where id = l.id;
  s := private.btp_recalculer_situation(s.id);
  perform private.journaliser(s.client_id, 'daliro.situation_avancee', 'btp_situations', s.id::text,
    jsonb_build_object('ligne', l.id, 'designation', left(l.designation, 120), 'avant', l.avancement, 'apres', round(p_avancement, 2)), s.entite_id);
  return to_jsonb(s);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Soumettre à la validation (file du socle, deux personnes)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_soumettre_situation(p_situation uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  c public.btp_chantiers;
  v_saisi uuid[];
  v_acteur record;
  v_demande uuid;
  v_version integer;
  v_cle text;
begin
  select * into s from public.btp_situations where id = p_situation for update;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut not in ('brouillon', 'refusee') then
    raise exception 'La situation n° % est déjà %.', s.numero, case s.statut when 'soumise' then 'soumise' when 'validee' then 'validée' else 'annulée' end
      using errcode = '23514';
  end if;
  s := private.btp_recalculer_situation(s.id);
  if s.periode_ht <= 0 then
    raise exception 'Rien à facturer sur cette période : l''avancement n''a pas bougé depuis la situation précédente.' using errcode = '23514';
  end if;
  select * into c from public.btp_chantiers where id = s.chantier_id;
  select * into v_acteur from private.acteur_courant();
  -- Ceux qui ont ouvert ou avancé cette situation : ils ne la valideront pas.
  select coalesce(array_agg(distinct j.acteur_id), '{}') into v_saisi
  from public.journal_opposable j
  where j.client_id = s.client_id and j.objet_type = 'btp_situations' and j.objet_id = s.id::text
    and j.action in ('daliro.situation_ouverte', 'daliro.situation_avancee')
    and j.acteur_type = 'utilisateur' and j.acteur_id is not null;
  if v_acteur.acteur_type = 'utilisateur' and v_acteur.acteur_id is not null then
    v_saisi := array(select distinct x from unnest(v_saisi || v_acteur.acteur_id) x where x is not null);
  end if;
  select count(*) + 1 into v_version from public.demandes_validation d
  where d.client_id = s.client_id and d.objet_type = 'btp_situation' and d.objet_id = s.id::text;
  v_cle := 'daliro:situation:' || s.id::text || ':v' || v_version;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, cle_idempotence)
  values (s.client_id, s.entite_id, 'daliro', 'daliro.valider_situation', 'btp_situation', s.id::text,
          left(format('Situation n° %s au %s — %s : %s € HT, net à payer %s €', s.numero, to_char(s.periode_fin, 'DD/MM/YYYY'), c.nom,
                      to_char(s.periode_ht, 'FM999G999G990D00'), to_char(s.net_a_payer, 'FM999G999G990D00')), 500),
          greatest(s.net_a_payer, 0),
          jsonb_build_object('situation', s.id, 'chantier', s.chantier_id, 'chantier_nom', c.nom, 'numero', s.numero,
                             'periode_fin', s.periode_fin, 'periode_ht', s.periode_ht, 'tva', s.tva, 'retenue', s.retenue,
                             'net_a_payer', s.net_a_payer, 'autoliquidation', s.autoliquidation, 'saisi_par', to_jsonb(v_saisi)),
          v_cle)
  on conflict (client_id, cle_idempotence) do nothing
  returning id into v_demande;
  if v_demande is null then
    select d.id into v_demande from public.demandes_validation d where d.client_id = s.client_id and d.cle_idempotence = v_cle;
  end if;
  update public.btp_situations set statut = 'soumise', demande_id = v_demande, soumise_le = now(), motif = null, maj_le = now() where id = s.id;
  perform private.journaliser(s.client_id, 'daliro.situation_soumise', 'btp_situations', s.id::text,
    jsonb_build_object('demande', v_demande, 'periode_ht', s.periode_ht, 'net_a_payer', s.net_a_payer), s.entite_id);
  return v_demande;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Valider : la demande doit être approuvée ; les montants et mentions sont figés
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_valider_situation(p_situation uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
  d public.demandes_validation;
  v_acteur record;
begin
  select * into s from public.btp_situations where id = p_situation for update;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut <> 'soumise' then
    raise exception 'La situation n° % n''est pas soumise à la validation (%).', s.numero, s.statut using errcode = '23514';
  end if;
  select * into d from public.demandes_validation where id = s.demande_id;
  if not found then
    raise exception 'La demande de validation de cette situation est introuvable.' using errcode = 'P0002';
  end if;
  if d.statut = 'rejetee' then
    update public.btp_situations set statut = 'refusee', maj_le = now(),
      motif = left(coalesce((select string_agg(ap.commentaire, ' / ') from public.approbations ap where ap.demande_id = d.id and ap.decision = 'rejete'), 'Refusée à la validation.'), 500)
    where id = s.id;
    perform private.journaliser(s.client_id, 'daliro.situation_refusee', 'btp_situations', s.id::text, jsonb_build_object('demande', d.id), s.entite_id);
    raise exception 'La situation a été refusée à la validation : corrigez-la et soumettez-la de nouveau.' using errcode = '23514';
  end if;
  if d.statut not in ('approuvee', 'executee') then
    raise exception 'La situation attend sa validation (%) : elle ne se valide pas avant.', d.statut using errcode = '23514';
  end if;
  select * into v_acteur from private.acteur_courant();
  s := private.btp_recalculer_situation(s.id);
  update public.btp_situations
  set statut = 'validee', validee_le = now(), validee_par = v_acteur.acteur_id, validee_libelle = v_acteur.acteur_libelle, maj_le = now()
  where id = s.id
  returning * into s;
  if d.statut = 'approuvee' then
    update public.demandes_validation set statut = 'executee' where id = d.id and statut = 'approuvee';
  end if;
  perform private.journaliser(s.client_id, 'daliro.situation_validee', 'btp_situations', s.id::text,
    jsonb_build_object('demande', d.id, 'numero', s.numero, 'periode_ht', s.periode_ht, 'tva', s.tva, 'retenue', s.retenue,
                       'net_a_payer', s.net_a_payer, 'mentions', s.mentions), s.entite_id);
  perform private.publier_evenement(s.client_id, 'daliro.situation_validee',
    jsonb_build_object('situation', s.id, 'chantier', s.chantier_id, 'numero', s.numero, 'net_a_payer', s.net_a_payer),
    'situation:' || s.id::text);
  return to_jsonb(s);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Annuler une situation pas encore validée
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_annuler_situation(p_situation uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_situations;
begin
  select * into s from public.btp_situations where id = p_situation for update;
  if not found then
    raise exception 'Situation introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut not in ('brouillon', 'soumise', 'refusee') then
    raise exception 'Une situation validée ne s''annule pas : elle est facturée.' using errcode = '23514';
  end if;
  update public.btp_situations set statut = 'annulee', motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now() where id = s.id returning * into s;
  perform private.journaliser(s.client_id, 'daliro.situation_annulee', 'btp_situations', s.id::text,
    jsonb_build_object('motif', p_motif, 'demande', s.demande_id), s.entite_id);
  return to_jsonb(s);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le tableau du chantier : b6_08, plus « situations »
-- ─────────────────────────────────────────────────────────────────────────
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
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = s.demande_id))
        order by s.numero desc), '[]'::jsonb)
      from public.btp_situations s where s.chantier_id = c.id and s.statut <> 'annulee'),
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
revoke execute on function private.btp_recalculer_situation(uuid) from public, anon, authenticated;
revoke execute on function private.btp_taux_tva_zone(text) from public, anon, authenticated;
grant execute on function private.btp_recalculer_situation(uuid) to service_role;
grant execute on function private.btp_taux_tva_zone(text) to service_role;
revoke execute on function public.btp_ouvrir_situation(uuid, date, numeric) from public, anon;
revoke execute on function public.btp_avancer_situation(uuid, numeric) from public, anon;
revoke execute on function public.btp_soumettre_situation(uuid) from public, anon;
revoke execute on function public.btp_valider_situation(uuid) from public, anon;
revoke execute on function public.btp_annuler_situation(uuid, text) from public, anon;
grant execute on function public.btp_ouvrir_situation(uuid, date, numeric) to authenticated, service_role;
grant execute on function public.btp_avancer_situation(uuid, numeric) to authenticated, service_role;
grant execute on function public.btp_soumettre_situation(uuid) to authenticated, service_role;
grant execute on function public.btp_valider_situation(uuid) to authenticated, service_role;
grant execute on function public.btp_annuler_situation(uuid, text) to authenticated, service_role;
