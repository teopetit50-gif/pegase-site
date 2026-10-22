-- 20261019142740 c4_19_c2_16
-- Source : dépôt : a879098a omega/modules/offload/migrations/c4_19_effacement.sql ; 3ee1f968 omega/modules/cashd/migrations/c2_16_taux_recent.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_19_effacement.sql @ a879098a, c2_16_taux_recent.sql @ 3ee1f968.
-- ═══ omega/modules/offload/migrations/c4_19_effacement.sql @ a879098a
-- c4_19 — OFFLOAD : l'effacement des données d'une personne (session C4, 19/10/2026)
--
-- Liste de Teo, point 9 : « restitution et effacement ». La restitution est c4_17. L'effacement de TOUTE
-- l'organisation relève du socle (preparer_effacement, puis la suppression du client) : chaque table d'OFFLOAD y est
-- reliée par client_id … on delete cascade, et le test c4_19 le vérifie sur le catalogue.
-- Ici, la demande d'une PERSONNE (un entrepreneur individuel, un interlocuteur) : « effacez mes données ».
--   · public.offload_effacer_compte(p_compte, p_motif) — gérant ou admin. Le compte garde son historique d'achats
--     (pièces comptables du client, chiffres sans nom) ; ses données personnelles sont rendues anonymes : nom,
--     interlocuteur, courriel, téléphone, ville ; les notes de contact et le détail des tâches sont vidés. Le compte
--     sort du cycle (statut « arrete ») et ses messages encore à valider ou prêts sont annulés.
--   · Un import ou une saisie qui retrouverait la même référence ne réécrit plus rien : un déclencheur garde le
--     compte effacé tel quel (offload_comptes.efface_le).
--   · L'effacement est au journal, sans les données effacées.
--
-- Règles de pose : alter … add column if not exists, create or replace. Aucun DROP, aucun DELETE : effacer, ici,
-- c'est rendre anonyme.

alter table public.offload_comptes add column if not exists efface_le timestamptz;
comment on column public.offload_comptes.efface_le is 'OFFLOAD — données personnelles effacées à la demande de la personne (c4_19) ; le compte ne se réécrit plus.';

-- Un compte effacé ne se remplit plus, quelle que soit la porte (import, saisie, fusion).
create or replace function private.offload_garder_efface()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if old.efface_le is not null then
    new.nom := old.nom;
    new.contact := null;
    new.email := null;
    new.telephone := null;
    new.ville := null;
    new.groupe := null;
    new.statut := 'arrete';
    new.statut_motif := old.statut_motif;
    new.efface_le := old.efface_le;
  end if;
  return new;
end $function$;
revoke execute on function private.offload_garder_efface() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'offload_comptes_garder_efface' and tgrelid = 'public.offload_comptes'::regclass) then
    create trigger offload_comptes_garder_efface before update on public.offload_comptes
      for each row execute function private.offload_garder_efface();
  end if;
end $$;

create or replace function private.offload_effacer_compte(p_compte uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_motif text := nullif(btrim(coalesce(p_motif, '')), '');
  v_envois integer := 0;
  r record;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if c.id is null then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'effacer les données d''une personne');
  if v_motif is null then
    raise exception 'Dites d''où vient la demande d''effacement (courrier, message, appel…).' using errcode = '22023';
  end if;
  if c.efface_le is not null then
    return jsonb_build_object('compte', c.id, 'efface_le', c.efface_le, 'deja', true);
  end if;

  -- Les messages qui n'ont pas encore quitté le circuit : annulés.
  for r in
    select e.id from public.envois e
    where e.client_id = c.client_id and e.module = 'offload' and e.statut in ('a_valider', 'pret')
      and ((e.objet_type = 'offload_reprises' and e.objet_id in (select x.id::text from public.offload_reprises x where x.compte_id = c.id))
        or (e.objet_type = 'offload_echeances' and e.objet_id in (select x.id::text from public.offload_echeances x where x.compte_id = c.id))
        or (e.objet_type = 'offload_affaires' and e.objet_id in (select x.id::text from public.offload_affaires x where x.compte_id = c.id)))
  loop
    perform private.annuler_envoi(r.id, 'Données de la personne effacées à sa demande.');
    v_envois := v_envois + 1;
  end loop;

  update public.offload_comptes
     set nom = 'Compte effacé (réf. ' || c.ref || ')', contact = null, email = null, telephone = null, ville = null, groupe = null,
         statut = 'arrete', statut_motif = 'Données personnelles effacées à la demande de la personne.',
         statut_par = (select auth.uid()), statut_le = now(), efface_le = now(), maj_le = now()
   where id = c.id;
  update public.offload_contacts set note = null, par = null where compte_id = c.id;
  update public.offload_taches
     set titre = 'Tâche d''un compte effacé', detail = 'Effacé à la demande de la personne.', compte_rendu = null, maj_le = now()
   where compte_id = c.id;

  perform private.journaliser_module(c.client_id, 'offload', 'offload.compte_efface', 'offload_comptes', c.id::text,
    jsonb_build_object('ref', c.ref, 'motif', left(v_motif, 500), 'envois_annules', v_envois), c.entite_id);
  return jsonb_build_object('compte', c.id, 'efface_le', now(), 'envois_annules', v_envois, 'deja', false);
end $function$;

create or replace function public.offload_effacer_compte(p_compte uuid, p_motif text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_effacer_compte(p_compte, p_motif) $function$;

revoke execute on function private.offload_effacer_compte(uuid, text) from public, anon;
grant execute on function private.offload_effacer_compte(uuid, text) to authenticated, service_role;
revoke execute on function public.offload_effacer_compte(uuid, text) from public, anon;
grant execute on function public.offload_effacer_compte(uuid, text) to authenticated, service_role;


-- ═══ omega/modules/cashd/migrations/c2_16_taux_recent.sql @ 3ee1f968
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
