-- recupere 20261005170900 filed_lot4g_acquittement_alerte
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : a4_09.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 5a5ec59e-c515-4fff-9c08-d2dd746988d4 (mcp__Supabase__execute_sql, 2026-10-05T17:04:02.773Z, résultat : réussi)
-- FILED, lot 4g (a4_09) — l'alerte « facture attendue absente » s'acquitte quand la facture arrive.
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
  -- Lot 4g : la facture arrivée tard acquitte l'alerte « facture attendue absente » (clé du socle : module:cle).
  update public.alertes set acquittee_le = now()
   where client_id = v_f.client_id and cle_regroupement = 'filed:charge_manquante:' || v_a.id::text and acquittee_le is null;
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

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005170900', 'filed_lot4g_acquittement_alerte', array['-- a4_09 posé par execute_sql (voir omega/migrations/a4_09_filed_lot4g_acquittement_alerte.sql)'])
on conflict do nothing;
select 'a4_09 ok' as r;
