-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_16 : le taux de change le plus récent l'emporte (19/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Depuis c2_03, une facture en devise prenait le taux saisi par son organisation, même ancien, avant tout taux de
-- référence plus récent. Avec les taux de la BCE chargés chaque jour ouvré (c2_15), un taux saisi il y a des mois
-- l'emporterait indéfiniment sur le taux du jour. Désormais : le taux le plus récent à la date du jour ; le même jour,
-- celui de l'organisation (sa saisie corrige la BCE pour ce jour-là). Un taux propre à la facture (taux_eur) reste prioritaire.
-- Mêmes colonnes, même ordre (create or replace view).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke puis grants.

-- L'état d'une pièce (c2_03), avec le choix du taux corrigé.
create or replace view public.cashd_factures_etat with (security_invoker = true) as
with i as (
  select x.facture_id,
         coalesce(sum(x.montant) filter (where x.reglement_id is not null), 0) as regle,
         coalesce(sum(x.montant) filter (where x.avoir_id is not null), 0) as avoirs_imputes,
         max(r.recu_le) as dernier_reglement_le
  from public.cashd_imputations x
  left join public.cashd_reglements r on r.id = x.reglement_id
  where x.annulee_le is null
  group by x.facture_id
), a as (
  select x.avoir_id, coalesce(sum(x.montant), 0) as impute
  from public.cashd_imputations x where x.annulee_le is null and x.avoir_id is not null group by x.avoir_id
), j as (select (now() at time zone 'Europe/Paris')::date as jour),
b as (
  select f.*, coalesce(i.regle, 0) as regle, coalesce(i.avoirs_imputes, 0) as avoirs_imputes, i.dernier_reglement_le,
         case
           when f.nature = 'avoir' then greatest(f.montant_ttc - coalesce(a.impute, 0), 0)
           when f.nature = 'devis' or f.statut in ('soldee', 'annulee', 'abandonnee') then 0
           else greatest(least(f.montant_ttc - coalesce(i.regle, 0) - coalesce(i.avoirs_imputes, 0), coalesce(f.reste_du_source, f.montant_ttc)), 0)
         end::numeric(14,2) as reste_du,
         j.jour,
         case when f.devise = 'EUR' then 1::numeric
              else coalesce(f.taux_eur, (select t.taux from public.cashd_taux_change t
                                         where t.devise = f.devise and t.jour <= j.jour and (t.client_id is null or t.client_id = f.client_id)
                                         -- c2_16 : le taux le plus récent d'abord ; le même jour, celui de l'organisation
                                         order by t.jour desc, (t.client_id is not null) desc limit 1)) end as taux
  from public.cashd_factures f cross join j
  left join i on i.facture_id = f.id
  left join a on a.avoir_id = f.id
)
select b.id, b.client_id, b.entite_id, b.compte_id, b.nature, b.numero, b.date_emission, b.echeance, b.montant_ht, b.montant_ttc,
       b.devise, b.reste_du_source, b.statut, b.statut_motif, b.statut_le, b.commande_ref, b.source, b.vue_le, b.cree_le, b.maj_le,
       b.regle, b.avoirs_imputes, b.dernier_reglement_le, b.reste_du,
       (b.jour - b.date_emission) as jours_ecoules,
       case when b.nature in ('facture', 'acompte') and b.reste_du > 0 and b.echeance < b.jour then b.jour - b.echeance else 0 end as retard_jours,
       case when b.nature not in ('facture', 'acompte') or b.reste_du <= 0 then null
            when b.echeance is null or b.echeance >= b.jour then 'non_echu'
            when b.jour - b.echeance <= 30 then '1_30'
            when b.jour - b.echeance <= 60 then '31_60'
            when b.jour - b.echeance <= 90 then '61_90'
            else 'plus_90' end as tranche,
       (b.echeance - b.date_emission) as delai_jours,
       -- c2_03 : la part contestée (hors relance), le reste relançable, l'euro
       least(b.montant_conteste, b.reste_du)::numeric(14,2) as montant_conteste,
       greatest(b.reste_du - b.montant_conteste, 0)::numeric(14,2) as reste_relancable,
       b.echeance_origine,
       b.taux as taux_eur,
       round(b.reste_du * b.taux, 2)::numeric(14,2) as reste_du_eur,
       round(b.montant_ttc * b.taux, 2)::numeric(14,2) as montant_ttc_eur
from b;

revoke all on table public.cashd_factures_etat from anon, authenticated;
grant select on table public.cashd_factures_etat to authenticated;

-- Le dernier taux connu de chaque devise (c2_15), selon le même choix.
create or replace function public.cashd_taux_connus(p_client uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('devise', d.devise, 'jour', t.jour, 'taux', t.taux, 'source', t.source) order by d.devise), '[]'::jsonb)
  from (select distinct f.devise from public.cashd_factures f where f.client_id = p_client and f.devise <> 'EUR') d
  left join lateral (select x.jour, x.taux, x.source from public.cashd_taux_change x
                     where x.devise = d.devise and (x.client_id is null or x.client_id = p_client)
                     -- le même choix que cashd_factures_etat (c2_16) : le plus récent, et le même jour celui de l'organisation
                     and x.jour <= (now() at time zone 'Europe/Paris')::date
                     order by x.jour desc, (x.client_id is not null) desc limit 1) t on true
$function$;

revoke execute on function public.cashd_taux_connus(uuid) from public, anon;
grant execute on function public.cashd_taux_connus(uuid) to authenticated, service_role;
