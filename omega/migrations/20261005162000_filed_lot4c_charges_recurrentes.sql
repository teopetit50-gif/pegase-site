-- FILED, lot 4c — Charges récurrentes : les abonnements produisent leurs écritures attendues.
--
-- Ce que ce lot pose :
--   filed_declarer_charge_recurrente, filed_arreter_charge_recurrente   les portes (gérant, admin) ;
--   private.filed_generer_charges_attendues(p_client)                   les écritures attendues, treize mois devant ;
--   private.filed_reconnaitre_charge(p_facture)                         la facture qui sert une écriture attendue :
--                                                                       elle en reçoit l'imputation (proposée, à valider) ;
--   private.filed_verifier_charges_manquantes(p_client)                 une facture attendue absente lève une alerte.
--
-- Rien n'est ressaisi : la charge déclarée une fois produit ses périodes ; la facture reçue les sert.
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les périodes d'une charge
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_pas_periodicite(p text) returns interval
language sql immutable set search_path to '' as $$
  select case p when 'mensuelle' then interval '1 month' when 'bimestrielle' then interval '2 months'
                when 'trimestrielle' then interval '3 months' when 'semestrielle' then interval '6 months'
                when 'annuelle' then interval '1 year' end
$$;

-- Produit les écritures attendues d'une charge jusqu'à une date (incluse), sans doublon.
create or replace function private.filed_generer_periodes(p_charge public.filed_charges_recurrentes, p_jusqu_au date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_periode date; v_n integer := 0; v_fin date; v_pas interval;
begin
  if not p_charge.actif then return 0; end if;
  v_pas := private.filed_pas_periodicite(p_charge.periodicite);
  v_fin := least(coalesce(p_charge.fin, p_jusqu_au), p_jusqu_au);
  v_periode := date_trunc('month', p_charge.debut::timestamp)::date;
  while v_periode <= v_fin loop
    if v_periode + (p_charge.jour_attendu - 1) >= p_charge.debut then
      insert into public.filed_charges_attendues (client_id, charge_id, periode, attendue_le, montant_ht)
      values (p_charge.client_id, p_charge.id, v_periode, v_periode + (p_charge.jour_attendu - 1), p_charge.montant_ht)
      on conflict (charge_id, periode) do nothing;
      if found then v_n := v_n + 1; end if;
    end if;
    v_periode := (v_periode + v_pas)::date;
  end loop;
  return v_n;
end $$;

-- Toutes les charges actives d'une organisation : treize mois devant.
create or replace function private.filed_generer_charges_attendues(p_client uuid, p_jusqu_au date default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_charges_recurrentes; v_n integer := 0;
begin
  for v_c in select * from public.filed_charges_recurrentes where client_id = p_client and actif loop
    v_n := v_n + private.filed_generer_periodes(v_c, coalesce(p_jusqu_au, (current_date + interval '13 months')::date));
  end loop;
  return v_n;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les portes
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_declarer_charge_recurrente(
  p_client uuid, p_entite uuid, p_fournisseur uuid, p_libelle text, p_periodicite text, p_montant_ht numeric,
  p_compte uuid, p_centre uuid default null, p_debut date default null, p_fin date default null,
  p_jour_attendu integer default 1, p_tolerance_pct numeric default 10, p_tolerance_jours integer default 10)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_id uuid; v_c public.filed_charges_recurrentes;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if not exists (select 1 from public.filed_fournisseurs f where f.id = p_fournisseur and f.client_id = p_client and f.statut in ('actif', 'a_confirmer')) then
    raise exception 'Fournisseur introuvable, bloqué ou refusé.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.filed_plan_comptable c where c.id = p_compte and c.client_id = p_client and c.actif) then
    raise exception 'Compte introuvable ou retiré.' using errcode = '22023';
  end if;
  if p_centre is not null and not exists (select 1 from public.filed_centres_cout k where k.id = p_centre and k.client_id = p_client and k.actif) then
    raise exception 'Centre de coût introuvable ou retiré.' using errcode = '22023';
  end if;
  if p_periodicite not in ('mensuelle', 'bimestrielle', 'trimestrielle', 'semestrielle', 'annuelle') then
    raise exception 'Périodicité inconnue : %.', coalesce(p_periodicite, 'vide') using errcode = '22023';
  end if;
  if coalesce(p_montant_ht, 0) <= 0 then raise exception 'Le montant attendu est positif.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Une charge récurrente porte un libellé.' using errcode = '22023'; end if;
  insert into public.filed_charges_recurrentes (client_id, entite_id, fournisseur_id, libelle, periodicite, jour_attendu, tolerance_jours, montant_ht, tolerance_pct, compte_id, centre_id, debut, fin, cree_par)
  values (p_client, p_entite, p_fournisseur, left(btrim(p_libelle), 200), p_periodicite, coalesce(p_jour_attendu, 1), coalesce(p_tolerance_jours, 10), round(p_montant_ht, 2), coalesce(p_tolerance_pct, 10), p_compte, p_centre, coalesce(p_debut, current_date), p_fin, v_uid)
  returning * into v_c;
  perform private.filed_generer_periodes(v_c, (current_date + interval '13 months')::date);
  perform private.filed_journaliser(p_client, 'filed.charge_recurrente.declaration', 'filed_charge_recurrente', v_c.id::text,
    jsonb_build_object('fournisseur', p_fournisseur, 'periodicite', p_periodicite, 'debut', v_c.debut, 'fin', v_c.fin), p_entite);
  return v_c.id;
end $$;

create or replace function public.filed_declarer_charge_recurrente(
  p_client uuid, p_entite uuid, p_fournisseur uuid, p_libelle text, p_periodicite text, p_montant_ht numeric,
  p_compte uuid, p_centre uuid default null, p_debut date default null, p_fin date default null,
  p_jour_attendu integer default 1, p_tolerance_pct numeric default 10, p_tolerance_jours integer default 10)
returns uuid language sql set search_path to '' as $$
  select private.filed_declarer_charge_recurrente(p_client, p_entite, p_fournisseur, p_libelle, p_periodicite, p_montant_ht, p_compte, p_centre, p_debut, p_fin, p_jour_attendu, p_tolerance_pct, p_tolerance_jours)
$$;
comment on function public.filed_declarer_charge_recurrente(uuid, uuid, uuid, text, text, numeric, uuid, uuid, date, date, integer, numeric, integer) is
  'Déclare un abonnement ou une charge récurrente : fournisseur, rythme, montant, compte, centre. Ses écritures attendues sont produites aussitôt, treize mois devant.';
revoke all on function public.filed_declarer_charge_recurrente(uuid, uuid, uuid, text, text, numeric, uuid, uuid, date, date, integer, numeric, integer) from public, anon;
grant execute on function public.filed_declarer_charge_recurrente(uuid, uuid, uuid, text, text, numeric, uuid, uuid, date, date, integer, numeric, integer) to authenticated, service_role;

create or replace function private.filed_arreter_charge_recurrente(p_charge uuid, p_fin date default null, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_charges_recurrentes; v_fin date;
begin
  select * into v_c from public.filed_charges_recurrentes where id = p_charge for update;
  if not found then raise exception 'Charge récurrente introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_c.client_id, array['gerant', 'admin'], v_c.entite_id);
  v_fin := coalesce(p_fin, current_date);
  update public.filed_charges_recurrentes set actif = false, fin = v_fin where id = p_charge;
  update public.filed_charges_attendues set statut = 'annulee' where charge_id = p_charge and statut in ('attendue', 'manquante') and periode > v_fin;
  perform private.filed_journaliser(v_c.client_id, 'filed.charge_recurrente.arret', 'filed_charge_recurrente', v_c.id::text,
    jsonb_build_object('fin', v_fin, 'motif', left(nullif(btrim(p_motif), ''), 300)), v_c.entite_id);
end $$;

create or replace function public.filed_arreter_charge_recurrente(p_charge uuid, p_fin date default null, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_arreter_charge_recurrente(p_charge, p_fin, p_motif) $$;
comment on function public.filed_arreter_charge_recurrente(uuid, date, text) is 'Arrête une charge récurrente à une date : les périodes au-delà sont annulées.';
revoke all on function public.filed_arreter_charge_recurrente(uuid, date, text) from public, anon;
grant execute on function public.filed_arreter_charge_recurrente(uuid, date, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. La facture qui sert une écriture attendue
-- ───────────────────────────────────────────────────────────────────────────
-- Même fournisseur, montant hors taxes dans la tolérance, date d'émission dans la fenêtre de la période
-- (de quinze jours avant la date attendue à la période suivante). La plus proche en date l'emporte.
-- La facture reçoit alors l'imputation de la charge, proposée à la file (jamais écrite d'office).
create or replace function private.filed_reconnaitre_charge(p_facture uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_a record; v_imp uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.nature <> 'facture' or v_f.fournisseur_id is null or v_f.montant_ht is null or v_f.date_emission is null then return null; end if;
  if v_f.statut in ('ecartee', 'refusee') then
    update public.filed_charges_attendues set statut = 'attendue', facture_id = null, recue_le = null where facture_id = v_f.id and statut = 'recue';
    return null;
  end if;
  select a.id into v_imp from public.filed_charges_attendues a where a.facture_id = v_f.id limit 1;
  if v_imp is not null then return v_imp; end if;

  select a.*, c.compte_id, c.centre_id, c.libelle as charge_libelle, c.tolerance_jours
    into v_a
    from public.filed_charges_attendues a
    join public.filed_charges_recurrentes c on c.id = a.charge_id
   where a.client_id = v_f.client_id and c.fournisseur_id = v_f.fournisseur_id
     and (c.entite_id is null or c.entite_id = v_f.entite_id)
     and a.statut in ('attendue', 'manquante')
     and abs(v_f.montant_ht - a.montant_ht) <= a.montant_ht * c.tolerance_pct / 100 + 0.005
     and v_f.date_emission between a.attendue_le - 15 and (a.periode + private.filed_pas_periodicite(c.periodicite))::date + 15
   order by abs(v_f.date_emission - a.attendue_le), abs(v_f.montant_ht - a.montant_ht)
   limit 1;
  if v_a.id is null then return null; end if;

  update public.filed_charges_attendues set statut = 'recue', facture_id = v_f.id, recue_le = now() where id = v_a.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'charge_reconnue',
    format('Facture reconnue comme la charge récurrente « %s », période %s.', v_a.charge_libelle, to_char(v_a.periode, 'MM/YYYY')),
    jsonb_build_object('charge', v_a.charge_id, 'attendue', v_a.id, 'periode', v_a.periode));
  perform private.filed_poser_resultat(v_f, 'recurrence.reconnue', 'info', false,
    format('Charge récurrente « %s » (%s).', v_a.charge_libelle, to_char(v_a.periode, 'MM/YYYY')), null,
    jsonb_build_object('charge', v_a.charge_id, 'attendue', v_a.id, 'periode', v_a.periode, 'montant_attendu', v_a.montant_ht), v_a.id::text);
  if v_f.statut = 'a_valider' then
    v_imp := private.filed_proposer_imputation(v_f.id, 'recurrente', v_a.compte_id, v_a.centre_id, v_a.charge_libelle);
    if v_imp is not null then update public.filed_charges_attendues set imputation_id = v_imp where id = v_a.id; end if;
  end if;
  return v_a.id;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. La facture attendue absente lève une alerte
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_verifier_charges_manquantes(p_client uuid, p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_a record; v_n integer := 0;
begin
  for v_a in
    select a.*, c.libelle as charge_libelle, c.entite_id, f.nom as fournisseur
      from public.filed_charges_attendues a
      join public.filed_charges_recurrentes c on c.id = a.charge_id
      join public.filed_fournisseurs f on f.id = c.fournisseur_id
     where a.client_id = p_client and a.statut = 'attendue' and a.attendue_le + c.tolerance_jours < p_aujourdhui
     order by a.attendue_le
  loop
    update public.filed_charges_attendues set statut = 'manquante', alerte_le = now() where id = v_a.id;
    perform private.lever_alerte(p_client, false, 'attention', 'filed',
      left(format('Facture attendue absente : %s (%s), période %s', v_a.charge_libelle, v_a.fournisseur, to_char(v_a.periode, 'MM/YYYY')), 200),
      jsonb_build_object('charge', v_a.charge_id, 'attendue', v_a.id, 'periode', v_a.periode, 'attendue_le', v_a.attendue_le, 'montant_ht', v_a.montant_ht, 'entite', v_a.entite_id),
      'filed.charge_manquante:' || v_a.id::text);
    perform private.filed_journaliser(p_client, 'filed.charge_manquante', 'filed_charge_attendue', v_a.id::text,
      jsonb_build_object('charge', v_a.charge_id, 'periode', v_a.periode, 'attendue_le', v_a.attendue_le), v_a.entite_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
comment on function private.filed_verifier_charges_manquantes(uuid, date) is
  'Passe en « manquante » chaque écriture attendue dont la date, plus la tolérance, est dépassée sans facture, et lève une alerte d''attention à l''organisation.';
